"use client"

type DataCardProps = {
  title: string;
  value: number;
};

/**
 * This component creates a card that displays data depending on the County and ZIP code selected.
 * @returns A card that will contain relevant data to the County and ZIP code selected in the
 * dropdown menus
 */
export default function DataCard({ title, value, }: DataCardProps) {

    return (
        <div className="min-w-[150px] min-h-96 lg:min-h-[40rem] bg-white child-component-borders">
            <div className="p-4 w-full h-full">
                {title ? ( 
                    <>
                        <h3 className="text-2xl font-bold text-center">{title}</h3>
                        <div className="flex">
                            <p className="mt-3 text-xl">Households: {value} </p>
                            <p className="text-sm text-neutral-500 flex place-self-end">&nbsp;(approximate)</p>
                        </div>
                        {/** TODO - Add schools data here */}
                    </>
                ) : (
                    <div className="w-full h-full flex justify-center">
                        <h1 className="text-lg flex place-self-center text-neutral-700">Select a School To Begin</h1>
                    </div>
                )}
            </div>
        </div>
    );
}