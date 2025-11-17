# Satisfeed - Data Collection & Dashboard

## Description  
In Spring 2025, Team Satisfeed partnered with the nonprofit Satisfeed, which provides hunger relief for families in and around Gwinnett County through food co-ops and weekend programs. Their mission is to fight food insecurity, reduce waste, and connect communities. The team created a data-driven dashboard using Google Colab and Power BI to visualize client demographics and service usage, giving the organization insights for program planning and resource allocation.

### Updates Fall 2025
This semester’s work expands the original dashboard by integrating a new dashboard section with an interactive map. The goal is to help Satisfeed identify trends in food insecurity around Georgia's schools / libraries in relation to food distribution geographical data to improve distribution planning.

## Project Documentation:
Project Demo [(https://app.powerbi.com/view?r=eyJrIjoiMGViYzE1YzktZmEzNi00OTJhLThhNWQtZDRkMjczOTZlNzAxIiwidCI6ImNmOTU1MmRiLTY2MGEtNGE5MS05YmQ2LTY1YzIzMDBmOWNiMSIsImMiOjF9)]

Project Website [https://satisfeeddashboardproject.carrd.co] 

Project Poster [STARS/CREATE Poster in the Docs folder] 

Final Report [([Final_Report-_Team_Satisfeed.docx](https://github.com/user-attachments/files/20028096/Final_Report-_Team_Satisfeed.docx))]

## Technologies
- Next.js
- Firebase
- Python

### Updates Fall 2025
- MapLibre GL JS - https://maplibre.org/maplibre-gl-js/docs/  

## Working Features
- Dashboard Login
- Select Dashboard Data Version
- Data visualization by:
   - Race
   - Income
   - Education
   - Employment Status
   - Food Distribution by County
   - Food Distribution by ZIP Code
   - Total Families Reached
   - Total People Helped
- Upload Raw Data
- Manage Data Versions

### Working Features Developed Fall 2025
- Dashboard Insights Tab  
New section of the Satisfeed dashboard focused on interactive layered maps enabling Satisfeed to view food distribution around GA, statistical information, and locations of schools / libraries.

- School Data Integration  
Interactive map overlay showing Georgia schools, allowing Satisfeed to view distribution geographically in relation to schools.
Involved integrating scripts to parse school data from public APIs and saving data to firebase. This allowed users to access said data when interacting with the maps in Dashboard Insights' Schools tab.

- Food Distribution Data Integration  
Dashboard now highlights total families served allowing deeper insight into which communities need the most assistance. 
Involved integrating a backend endpoint to safely parse CSV file of dirstibution data, and save (approximate) address coordinates with LocationIQ api as a persistant file. This allowed users to safely view distribution data on the map.

- Library Data Integration  
Interactive map overlay showing Georgia Libraries, allowing Satisfeed to view distribution geographically in relation to libraries.
Involved integrating scripts to parse library data from public APIs and saving data to firebase. This allowed users to access said data when interacting with the maps in Dashboard Insights' Libraries tab.

- County / ZIP Statistics  
Dashboard integrates relevant statisitcs per county / ZIP code selected while also showcasing location on maps.
Involved working with exisiting GEOJson data which allows users to select needed County / ZIP to be presented with relevant information.

---

## Installation Steps
1. Clone the repo: git clone https://github.com/nhuthanhtran/Satisfeed
2. Install dependencies: install npm with "npm install"
3. Add environment variables to .env.local file in root directory
### Updates Fall 2025 
4. Ensure MapLibre is installed
```
npm install maplibre-gl
```
5. Apply updated environment variables
```
NEXT_PUBLIC_MAPTILER_KEY=
LOCATIONIQ_KEY=
```

7. Verify Firebase credentials include rules for new data models.

## Running Steps
1. Run the development server:
   
```
npm run dev  
# or  
yarn dev  
# or  
pnpm dev  
# or  
bun dev  
```  
    
2. Open http://localhost:3000 with your browser to see the result.
3. Sign up for an account and verify with your email to get approved as an admin.
4. You can start editing the page by modifying app/page.tsx. The page auto-updates as you edit the file.

## Spring 2025 Team
Caleb Cedeno - Project Manager & Visualizations 
Elizabeth Doss - Data analyzer & Client Liason 
Damaris Montecinos - Data modeler, Project Documenter

## Fall 2025 Team
Sam Keller - Code Architecture / Lead programmer, UI/UX designer, Client liaison <br>
Dylan Long - Testing lead / Team manager 🦉  
Ewura Ama Awere - Data Modeler, Documentation Lead 

## Outreach Activities
1. Poster was presented at Georgia Gwinnett College's Student Talent and Research Showcase (STARS) 4/17/2025
2. Dashboard demo was given at Georgia Gwinnett College's CREATE Symposium 4/24/2025
3. Expanded Dashboard demo was given at Georgia Gwinnett College's CREATE Symposium 11/21/2025

---

## Technologies and Usage

Data was analyzed and visualized using Google Collab, a cloud version of the Python-based Jupyter Notebook. Project management was conducted using Jira. Dashboard
layout was created in Power BI for later implementation in Javascript by Thanh Tran. The final project will include a database and password-protected site where the 
dashboard can be viewed by Satisfeed employees.

## Spring 2025 Project Progress
Disclaimer: The notebook, dataset, and PBIX file cannot be displayed, as they contain personal information of Satisfeed customers including full names, addresses, and phone numbers. Therefore, all displayed metrics and stats are a high-level overview of the analysis without specific data points displayed.

### Analysis Methods
PCA and linear regression were attempted on the data set, but failed due to a lack of numerical data and numerous gaps in client reporting. As a result, most of the 
statistics are simple descriptive ones.

One of the key findings related to a possible motivation for clients using Satisfeed. Of clients who answered demographic questions, 30% reported being unemployed or 
employed only part time. Additionally, the most common income bracket for Satisfeed clients was in the 0-25k range. This suggests that many clients come to Satisfeed 
because they are experiencing financial difficulties.

![image](https://github.com/user-attachments/assets/e4c9e069-d946-4a56-89da-ae47d1f9da80)

![image](https://github.com/user-attachments/assets/08eda490-98dd-49db-bcc2-87bc438ee648)

Another key finding was the background of Satisfeed clients. Of clients who answered, almost 80% were Hispanic or Latino. This may indicate a need for Satisfeed to 
develop bilingual programming, in order to reach those among their client base more confident in Spanish than English.

![image](https://github.com/user-attachments/assets/91d3c0d2-ee81-4221-aaa0-cd337eb5fbde)


### Remaining Scope
It would be optimal to pull data to the dashboard straight from Satisfeeds database, for which plug-in compatibility with PowerBI would have to be researched. The 
client would also like the "lbs of food served" card to be real time where they can live update the data. As of now the card pulls static data from a hypothetical table 
and is used as a placeholder.

---

## License
This project is licensed under the [MIT License](LICENSE).  
© 2025 Georgia Gwinnett College

