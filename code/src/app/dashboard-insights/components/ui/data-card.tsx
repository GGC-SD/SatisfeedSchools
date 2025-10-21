"use client"

/**
 * Props for the DataCard.
 *
 * @property title     Display name of the currently selected school. When empty, the
 *                     "Select a School To Begin" placeholder is shown instead of the card body.
 * @property value     Number of households within the map’s current selected radius.
 * @property onClear   Optional handler invoked when the "Clear Selected School" button is clicked.
 *                     Intended to call the map's imperative `clearSelection()` from the parent.
 */
type DataCardProps = {
  title: string;
  value: number;
onClear?: () => void;
};

/**
 * DataCard
 *
 * Presentation-only component that displays the current school selection summary.
 * When a school is selected, shows its name and the computed household count.
 * The "Clear Selected School" button (if `onClear` is provided) triggers the parent’s
 * clear logic (e.g., calls the map’s `clearSelection()` via ref). No internal state here.
 *
 * @returns A card reflecting the selected school's data, or a placeholder when none is selected.
 */
export default function DataCard({ title, value, onClear }: DataCardProps) {

    return (
        <div className="min-w-[150px] min-h-96 lg:min-h-[40rem] bg-white child-component-borders">
            <div className="p-4 w-full h-full">
                {title ? ( 
                    <div className="w-full h-full flex flex-col">
                        <h3 className="text-2xl font-bold text-center">{title}</h3>
                        <div className="flex">
                            <p className="mt-3 text-xl">Households: {value} </p>
                            <p className="text-sm text-neutral-500 flex place-self-end">&nbsp;(approximate)</p>
                        </div>
                        {/** TODO - Add schools data here */}
                        <div className="mt-auto self-end flex">
                            <button
                                type="button"
                                onClick={onClear}
                                className="button-insights"
                                aria-label="Clear selected school"
                            >
                                Clear Selected School
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex justify-center">
                        <h1 className="text-lg flex place-self-center text-neutral-700">Select a School To Begin</h1>
                    </div>
                )}
            </div>
        </div>
    );
}