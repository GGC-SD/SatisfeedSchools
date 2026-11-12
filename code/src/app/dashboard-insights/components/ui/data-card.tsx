"use client"

import { SchoolRecord } from "@/data/schoolTypes";
import { LibraryDoc } from "@/data/libraryTypes";
import { PantryDoc } from "@/data/pantryTypes";
import { useLanguage } from "@/components/LanguageContext";

/**
 * Props for the DataCard.
 *
 * @property title     Display name of the currently selected school. When empty, the
 *                     "Select a School To Begin" placeholder is shown instead of the card body.
 * @property value     Number of households within the map’s current selected radius.
 * @property onClear   Optional handler invoked when the "Clear Selected School" button is clicked.
 *                     Intended to call the map's imperative `clearSelection()` from the parent.
 */
type DataCardProps ={
  title: string;
  value: number;
  record: SchoolRecord | LibraryDoc | PantryDoc | null;
  type: string;
  onClear?: () => void;
};

/**
 * DataCard
 *
 * Presentation-only component that displays the current school or library selection summary.
 * When a school or library is selected, shows its name and the computed household count.
 * The "Clear Selected School/Library" button (if `onClear` is provided) triggers the parent’s
 * clear logic (e.g., calls the map’s `clearSelection()` via ref). No internal state here.
 *
 * @returns A card reflecting the selected school's/librarie's data, or a placeholder when none is selected.
 */
export default function DataCard({ title, value, record, type, onClear }: DataCardProps) {
  const { language } = useLanguage();
  const es = language === "es";

  const normalizedType = type.toLowerCase();

  const isSchool = normalizedType === "school";
  const isLibrary = normalizedType === "library";
  const isPantry = normalizedType === "pantry";

  const typeLabel = isSchool
    ? (es ? "Escuela" : "School")
    : isLibrary
      ? (es ? "Biblioteca" : "Library")
      : isPantry
        ? (es ? "Despensa" : "Pantry")
        : type;

  if (!record && !title) {
    return (
      <div className="min-w-[150px] min-h-96 lg:min-h-[20rem] bg-white child-component-borders flex justify-center items-center p-4">
        <h1 className="text-lg text-neutral-700 text-center">
          {es ? `Seleccione una ${typeLabel.toLowerCase()} para comenzar` : `Select a ${typeLabel} To Begin`}
        </h1>
      </div>
    );
  }

  const displayOrder: string[] = isSchool
    ? [
        "address",
        "city",
        "county",
        "zip",
        "enrollment",
        "povertyRate",
        "povertyPeriod",
        "phone",
        //"website",
      ]
    : isLibrary
      ? [
          "address",
          "city",
          "county",
          "zip",
          "phone",
          //"hours",
          "website",
        ]
      : [
          "address",
          //"city",
          //"state",
          //"zip",
          "phone",
          //"hours",
          "website",
          //"resourceType",
          //"dataSource",
         // "lastVerifiedDate",
        ];

  const fieldLabels: Record<string, string> = {
    address: es ? "Dirección" : "Address",
    city: es ? "Ciudad" : "City",
    county: es ? "Condado" : "County",
    state: es ? "Estado" : "State",
    zip: es ? "Código postal" : "ZIP Code",
    enrollment: es ? "Matrícula" : "Enrollment",
    povertyRate: es ? "Tasa de pobreza del sector censal" : "Census Tract Poverty Rate",
    povertyPeriod: es ? "Período de los datos de pobreza" : "Poverty Data Period",
    phone: es ? "Número de teléfono" : "Phone Number",
    hours: es ? "Horario" : "Hours",
    website: es ? "Sitio web" : "Website",
    organization: es ? "Organización" : "Organization",
    resourceType: es ? "Tipo de recurso" : "Resource Type",
    dataSource: es ? "Fuente de datos" : "Data Source",
    lastVerifiedDate: es ? "Última verificación" : "Last Verified",
  };

  const recordFields = record as unknown as Record<string, unknown>;

  return (
    <div className="min-w-[150px] min-h-36 lg:min-h-[20rem] bg-white child-component-borders">
      <div className="p-3 w-full h-full flex flex-col">
        <h3 className="text-2xl font-bold text-center">
          {title || (es ? `${typeLabel} seleccionada` : `Selected ${typeLabel}`)}
        </h3>

        {(isSchool || isLibrary) && (
        <div className="flex mt-2 text-md flex-col xl:flex-row xl:justify-between">
          <div className="font-medium uppercase">
            {es ? "Hogares:" : "Households:"}
          </div>

          <div className="flex mb-1">
            <div>{value.toLocaleString()}</div>
            <div className="text-sm text-neutral-500 flex place-self-end">
              &nbsp;{es ? "(aprox.)" : "(approximate)"}
            </div>
          </div>
        </div>
        )}

        {record ? (
          <div className="text-md">
            {displayOrder.map((key) => {
              const val = recordFields[key];

              return (
                <div
                  key={key}
                  //className="flex flex-col xl:flex-row xl:justify-between mb-1 gap-x-2"
                  className="flex flex-row justify-between mb-1 gap-x-2"
                >
                  <div className="font-medium uppercase">
                    {fieldLabels[key] || key}:
                  </div>

                  <div className="break-words">
                    {val === undefined || val === null || val === "" ? (
                      es ? "No disponible" : "Not Available"
                    ) : key === "povertyRate" && typeof val === "number" ? (
                      `${val.toFixed(1)}%`
                    ) : key === "website" && typeof val === "string" ? (
                      <a
                        href={
                          val.startsWith("http") ? val : `https://${val}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {es ? "Visitar sitio web" : "Visit Website"}
                      </a>
                    ) : key === "hours" && typeof val === "string" ? (
                      val
                    ) : (
                      String(val)
                    )}
                  </div>
                </div>
              );
            })}

            
          </div>
        ) : (
          <p className="text-neutral-500 mt-4">
            {es ? "No se encontraron datos adicionales." : "No additional data found."}
          </p>
        )}

        <div className="mt-2 self-end flex">
          <button
            type="button"
            onClick={onClear}
            className="button-insights"
            aria-label={es ? `Borrar ${typeLabel.toLowerCase()} seleccionada` : `Clear selected ${typeLabel.toLowerCase()}`}
          >
            {es ? `Borrar ${typeLabel.toLowerCase()} seleccionada` : `Clear Selected ${typeLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}