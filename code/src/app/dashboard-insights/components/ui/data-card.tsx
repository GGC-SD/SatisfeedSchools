"use client"

//import use state for functionality

/**
 * This component creates a card that displays data depending on the County and ZIP code selected.
 * @returns A card that will contain relevant data to the County and ZIP code selected in the
 * dropdown menus
 */
export default function DataCard() {

    return (
        <div className="min-w-[150px] min-h-96 lg:min-h-[40rem] bg-white child-component-borders">
            <div className="w-full h-full flex justify-center">
                <h1 className="text-lg flex place-self-center text-neutral-400">School Information / Data</h1>
            </div>
        </div>
    );

}