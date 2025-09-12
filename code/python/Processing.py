import sys
import pandas as pd
import json
import io
import numpy as np

def process_csv(dataframes):
    df = pd.concat(dataframes, ignore_index=True)

    df_cleaned = df.dropna(how='all').reset_index(drop=True)

    columns_of_interest = ["Case #", "County", "Assistance Category", "Amount", "Unit", "Assistance Date", "Zip code"]
    missing_cols = [col for col in columns_of_interest if col not in df_cleaned.columns]

    if missing_cols:
        return json.dumps({"error": f"Missing columns: {missing_cols}"})

    df_selected = df_cleaned[columns_of_interest].copy()

    # Convert "Amount" to numeric (handle errors)
    df_selected["Amount"] = pd.to_numeric(df_selected["Amount"], errors="coerce").fillna(0)

    # Standardize county names and Zip Codes
    df_selected["County"] = df_selected["County"].str.strip().str.lower().replace({"gwinett": "gwinnett"})
    df_selected["Zip code"] = df_selected["Zip code"].astype(str).str.zfill(5).str.strip()

    #Load Zip_city mapping csv file for city name display
    zip_ref_path = "./public/data/Zip-City_Mapping.csv"
    zip_ref = pd.read_csv(zip_ref_path)
    zip_ref["zip"] = zip_ref["zip"].astype(str).str.zfill(5).str.strip()

    # Merge with reference to standardize city names
    df_selected = df_selected.merge(zip_ref, how="left", left_on="Zip code", right_on="zip")
    df_selected["City"] = df_selected["City"].fillna("Unmatched Zip").str.title()
    df_selected.drop(columns=["zip"], inplace=True)

    # Identify unmatched zip code records
    unmatched_data = df_selected[df_selected["City"] == "Unmatched Zip"].copy()
    unmatched_summary = unmatched_data.groupby("Zip code").agg({
        "Amount": "sum",
        "Case #": "count"
    }).reset_index().rename(columns={"Case #": "peopleHelped"})

    # Demographics
    race_columns = [
        "Asian", "Black or African-American", "Hispanic, Latino, or Spanish Origin",
        "Middle Eastern or North African", "White", "American Indian", "Multiracial",
        "Pacific Islander", "Other", "Prefers not to answer", "Undisclosed",
        "A race/ethnicity not listed here"
    ]
    def determine_race(row):
        for col in race_columns:
            if str(row.get(col, "")).strip().upper() == "YES":
                return col
        return "Unknown"

    df_selected["Race"] = df_cleaned.apply(determine_race, axis=1)

    def bin_income(val):
        try:
            val = float(val)
            if val < 25000: return "0-25K"
            elif val < 50000: return "25K-50K"
            elif val < 75000: return "50K-75K"
            elif val < 100000: return "75K-100K"
            elif val < 125000: return "100K-125K"
            else: return "125K+"
        except:
            return "Unknown"

    df_selected["Income Bin"] = df_cleaned.get("Household Income", pd.Series(["Unknown"] * len(df_cleaned))).apply(bin_income)
    df_selected["Education"] = df_cleaned.get("Education", "Unknown")

    employment_columns = [
        "Full time", "Part time", "Unemployed-Seeking", "Unemployed-Not Seeking",
        "Disabled", "Retired", "Prefer not to answer", "College Student",
        "Not applicable", "Unemployed"
    ]

    def determine_employment(row):
        for col in employment_columns:
            if str(row.get(col, "")).strip().upper() == "YES":
                return col
        return "Unknown"

    df_selected["Employment Status"] = df_cleaned.apply(determine_employment, axis=1)

    # County-level summary
    county_summary = df_selected.groupby("County")["Amount"].sum().reset_index()
    county_summary["peopleHelped"] = df_selected.groupby("County")["Case #"].count().reset_index()["Case #"]

    # Extract total metrics
    total_people_helped = df_selected["Case #"].count()
    total_food_delivered = df_selected["Amount"].sum()

    # Process date-based summaries
    if "Assistance Date" in df_selected.columns:
        df_selected["Assistance Date"] = pd.to_datetime(df_selected["Assistance Date"], errors="coerce")

        df_selected["Year"] = df_selected["Assistance Date"].dt.year
        df_selected["Month"] = df_selected["Assistance Date"].dt.strftime("%B %Y")
        df_selected["Week"] = df_selected["Assistance Date"].dt.strftime("Week %U, %Y")

        weekly_summary = df_selected.groupby("Week")["Amount"].sum().reset_index()
        weekly_summary.rename(columns={"Amount": "amountDelivered"}, inplace=True)
        weekly_summary["peopleHelped"] = df_selected.groupby("Week")["Amount"].count().reset_index()["Amount"]
    else:
        weekly_summary = pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

    # County-level monthly and yearly structured data
    df_selected["Assistance Date"] = pd.to_datetime(df_selected["Assistance Date"], errors="coerce")
    df_selected["YearMonth"] = df_selected["Assistance Date"].dt.strftime("%Y-%m")
    df_selected["Year"] = df_selected["Assistance Date"].dt.strftime("%Y")

    #Calculate data timeframe for version metadata
    start_date = df_selected["Assistance Date"].min()
    end_date = df_selected["Assistance Date"].max()

    start_str = start_date.strftime("%Y-%m-%d") if pd.notnull(start_date) else None
    end_str = end_date.strftime("%Y-%m-%d") if pd.notnull(end_date) else None
    record_count = len(df_selected)

    monthly_group = df_selected.groupby(["YearMonth", "County"]).agg({
        "Amount": "sum",
        "Case #": "count"
    }).reset_index().rename(columns={"Case #": "peopleHelped"})

    yearly_group = df_selected.groupby(["Year", "County"]).agg({
        "Amount": "sum",
        "Case #": "count"
    }).reset_index().rename(columns={"Case #": "peopleHelped"})

    county_monthly = {}
    for _, row in monthly_group.iterrows():
        ym = row["YearMonth"]
        entry = {
            "County": row["County"],
            "Amount": float(row["Amount"]),
            "peopleHelped": int(row["peopleHelped"])
        }
        county_monthly.setdefault(ym, []).append(entry)

    county_yearly = {}
    for _, row in yearly_group.iterrows():
        year = row["Year"]
        entry = {
            "County": row["County"],
            "Amount": float(row["Amount"]),
            "peopleHelped": int(row["peopleHelped"])
        }
        county_yearly.setdefault(year, []).append(entry)

    #Zip code and city summary
    zip_summary = df_selected.groupby(["Zip code", "City"]).agg({
        "Amount": "sum",
        "Case #": "count"
    }).reset_index().rename(columns={"Case #": "peopleHelped"})

    # Static zip-level demographics
    zip_race = format_grouped(df_selected.groupby(["Zip code", "Race"]).size().reset_index(name="count"), "Race")
    zip_income = format_grouped(df_selected.groupby(["Zip code", "Income Bin"]).size().reset_index(name="count"), "Income Bin")
    zip_education = format_grouped(df_selected.groupby(["Zip code", "Education"]).size().reset_index(name="count"), "Education")
    zip_employment = format_grouped(df_selected.groupby(["Zip code", "Employment Status"]).size().reset_index(name="count"), "Employment Status")

    # Merge into zip_summary
    zip_summary_records = zip_summary.to_dict(orient="records")
    for entry in zip_summary_records:
        z = entry["Zip code"]
        entry["Race"] = zip_race.get(z, [])
        entry["Income"] = zip_income.get(z, [])
        entry["Education"] = zip_education.get(z, [])
        entry["Employment"] = zip_employment.get(z, [])

    monthly_summary, zip_monthly = build_monthly_and_zip_summary_with_demographics(df_selected)
    yearly_summary, zip_yearly = build_yearly_and_zip_yearly_summary_with_demographics(df_selected)


    return generate_final_result(
        total_people_helped, total_food_delivered,
        county_summary, yearly_summary, monthly_summary, weekly_summary,
        county_monthly, county_yearly,
        zip_summary_records, zip_monthly, zip_yearly,
        unmatched_summary, start_str, end_str, record_count
    )

def format_grouped(df, group_key):
    result = {}
    for _, row in df.iterrows():
        zip_code = row["Zip code"]
        label = row[group_key]
        count = row["count"]
        result.setdefault(zip_code, []).append({"label": label, "count": int(count)})
    return result

def group_zip_demographics_by_period(df_selected, period_col):
    def format_grouped_period(df, group_key):
        result = {}
        for _, row in df.iterrows():
            period = row[period_col]
            zip_code = row["Zip code"]
            label = row[group_key]
            count = row["count"]
            result.setdefault(period, {})
            result[period].setdefault(zip_code, [])
            result[period][zip_code].append({"label": label, "count": int(count)})
        return result

    return {
        "race": format_grouped_period(df_selected.groupby([period_col, "Zip code", "Race"]).size().reset_index(name="count"), "Race"),
        "income": format_grouped_period(df_selected.groupby([period_col, "Zip code", "Income Bin"]).size().reset_index(name="count"), "Income Bin"),
        "education": format_grouped_period(df_selected.groupby([period_col, "Zip code", "Education"]).size().reset_index(name="count"), "Education"),
        "employment": format_grouped_period(df_selected.groupby([period_col, "Zip code", "Employment Status"]).size().reset_index(name="count"), "Employment Status"),
    }


def generate_final_result(
        total_people_helped, total_food_delivered,
        county_summary, yearly_summary, monthly_summary, weekly_summary,
        county_monthly, county_yearly,
        zip_summary_records, zip_monthly, zip_yearly,
        unmatched_summary, start_str, end_str, record_count
):
    result = {
        "dataset_info": {
            "startDate": start_str,
            "endDate": end_str,
            "recordCount": record_count
        },
        "total_people_helped": total_people_helped,
        "total_food_delivered": total_food_delivered,
        "county_summary": county_summary.to_dict(orient="records"),
        "yearly_summary": yearly_summary.to_dict(orient="records"),
        "monthly_summary": monthly_summary.to_dict(orient="records"),
        "weekly_summary": weekly_summary.to_dict(orient="records"),
        "county_monthly": {"monthly": county_monthly},
        "county_yearly": {"yearly": county_yearly},
        "zip_summary": zip_summary_records,
        "zip_monthly": {"monthly": zip_monthly},
        "zip_yearly": {"yearly": zip_yearly},
        "unmatched_zip_summary": unmatched_summary.to_dict(orient="records"),
    }

    return json.dumps(result, default=convert_json_compatible)

def build_monthly_and_zip_summary_with_demographics(df_selected):
    monthly_totals = df_selected.groupby("YearMonth").agg(
        amountDelivered=("Amount", "sum"),
        peopleHelped=("Amount", "count")
    ).reset_index()

    zip_monthly_group = df_selected.groupby(["YearMonth", "Zip code", "City"]).agg(
        Amount=("Amount", "sum"),
        peopleHelped=("Case #", "count")
    ).reset_index()

    def grouped_demo(col, group_key):
        return df_selected.groupby([group_key, "Zip code", col]).size().reset_index(name="count")

    def grouped_demo_global(col, group_key):
        return df_selected.groupby([group_key, col]).size().reset_index(name="count")

    demo_fields = {
        "Race": "Race",
        "Income": "Income Bin",
        "Education": "Education",
        "Employment": "Employment Status"
    }

    demo_zip_monthly = {}
    for key, field in demo_fields.items():
        df = grouped_demo(field, "YearMonth")
        for _, row in df.iterrows():
            ym, zip_code, label = row["YearMonth"], row["Zip code"], row[field]
            demo_zip_monthly.setdefault(ym, {}).setdefault(zip_code, {}).setdefault(key, []).append({
                "label": label,
                "count": int(row["count"])
            })

    demo_monthly = {}
    for key, field in demo_fields.items():
        df = grouped_demo_global(field, "YearMonth")
        for _, row in df.iterrows():
            m, label = row["YearMonth"], row[field]
            demo_monthly.setdefault(m, {}).setdefault(key, []).append({
                "label": label,
                "count": int(row["count"])
            })

    zip_monthly = {}
    for _, row in zip_monthly_group.iterrows():
        ym = row["YearMonth"]
        zip_code = row["Zip code"]
        record = {
            "ZipCode": zip_code,
            "City": row["City"],
            "Amount": float(row["Amount"]),
            "peopleHelped": int(row["peopleHelped"]),
        }
        for key in demo_fields:
            record[key] = demo_zip_monthly.get(ym, {}).get(zip_code, {}).get(key, [])
        zip_monthly.setdefault(ym, []).append(record)

    def attach_monthly_demo(row):
        m = row["YearMonth"]
        enriched = row.to_dict()
        for key in demo_fields:
            enriched[key] = demo_monthly.get(m, {}).get(key, [])
        return enriched

    monthly_summary = pd.DataFrame([attach_monthly_demo(row) for _, row in monthly_totals.iterrows()])
    return monthly_summary, zip_monthly


def build_yearly_and_zip_yearly_summary_with_demographics(df_selected):
    yearly_totals = df_selected.groupby("Year").agg(
        amountDelivered=("Amount", "sum"),
        peopleHelped=("Amount", "count")
    ).reset_index()

    zip_yearly_group = df_selected.groupby(["Year", "Zip code", "City"]).agg(
        Amount=("Amount", "sum"),
        peopleHelped=("Case #", "count")
    ).reset_index()

    def grouped_demo(col, group_key):
        return df_selected.groupby([group_key, "Zip code", col]).size().reset_index(name="count")

    def grouped_demo_global(col, group_key):
        return df_selected.groupby([group_key, col]).size().reset_index(name="count")

    demo_fields = {
        "Race": "Race",
        "Income": "Income Bin",
        "Education": "Education",
        "Employment": "Employment Status"
    }

    demo_zip_yearly = {}
    for key, field in demo_fields.items():
        df = grouped_demo(field, "Year")
        for _, row in df.iterrows():
            year, zip_code, label = row["Year"], row["Zip code"], row[field]
            demo_zip_yearly.setdefault(year, {}).setdefault(zip_code, {}).setdefault(key, []).append({
                "label": label,
                "count": int(row["count"])
            })

    demo_yearly = {}
    for key, field in demo_fields.items():
        df = grouped_demo_global(field, "Year")
        for _, row in df.iterrows():
            y, label = row["Year"], row[field]
            demo_yearly.setdefault(y, {}).setdefault(key, []).append({
                "label": label,
                "count": int(row["count"])
            })

    zip_yearly = {}
    for _, row in zip_yearly_group.iterrows():
        year = row["Year"]
        zip_code = row["Zip code"]
        record = {
            "ZipCode": zip_code,
            "City": row["City"],
            "Amount": float(row["Amount"]),
            "peopleHelped": int(row["peopleHelped"]),
        }
        for key in demo_fields:
            record[key] = demo_zip_yearly.get(year, {}).get(zip_code, {}).get(key, [])
        zip_yearly.setdefault(year, []).append(record)

    def attach_yearly_demo(row):
        y = row["Year"]
        enriched = row.to_dict()
        for key in demo_fields:
            enriched[key] = demo_yearly.get(y, {}).get(key, [])
        return enriched

    yearly_summary = pd.DataFrame([attach_yearly_demo(row) for _, row in yearly_totals.iterrows()])
    return yearly_summary, zip_yearly

def convert_json_compatible(obj):
    """ Convert Pandas/Numpy data types to standard Python types """
    if isinstance(obj, (np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")
    elif isinstance(obj, pd.Series):
        return obj.to_list()
    return obj

    return json.dumps(result, default=convert_json_compatible)

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.buffer.read()
        # Safely decode using UTF-8 with BOM fallback
        csv_text = raw_input.decode("utf-8-sig")
        df = pd.read_csv(io.StringIO(csv_text))
        result = process_csv([df])
        print(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(json.dumps({"error": f"Fatal error: {str(e)}"}))
        sys.exit(1)