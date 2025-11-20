"use client";

type KeyProps = {
  currentMap: string;
};

export default function KeyOverlay({ currentMap }: KeyProps) {
  return (
    <div className="border-t-2 border-yellow-400 h-auto bg-neutral-200 text-sm py-1 px-2">
      <h1 className="text-lg">Legend</h1>
      <div className="flex flex-wrap gap-y-0 gap-x-2">
        {/** BOTH MAPS WILL HAVE THESE */}
        <div className="flex gap-1">
          <div className="w-6 h-6 bg-neutral-300 rounded-full border-dashed border-spacing-0.5 border-2 border-black"></div>
          <p>Selected Area</p>
        </div>
        <div className="flex gap-1">
          <div className="w-6 h-6 bg-[#7c908299] rounded-full"></div>
          <p>Unique Households Served</p>
        </div>

        {/** School's Map Key */}
        {currentMap == "school" && (
          <>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#fc4238] rounded-full border-2 border-white"></div>
              <p>Single School</p>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#8c201b] rounded-full border-2 border-white">
                <p className="text-center text-white">#</p>
              </div>
              <p>School Cluster</p>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#2563eb] rounded-full border-2 border-white"></div>
              <p>Selected School</p>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#4277e841] rounded-full border-2 border-[#2563eb]"></div>
              <p>School Impact Zone</p>
            </div>
          </>
        )}

        {/** Library's Map Key */}
        {currentMap == "library" && (
          <>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#1fb874] rounded-full border-2 border-white"></div>
              <p>Single Library</p>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#15613e] rounded-full border-2 border-white">
                <p className="text-center text-white">#</p>
              </div>
              <p>Library Cluster</p>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#2563eb] rounded-full border-2 border-white"></div>
              <p>Selected Library</p>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-[#4277e841] rounded-full border-2 border-[#2563eb]"></div>
              <p>Library Impact Zone</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
