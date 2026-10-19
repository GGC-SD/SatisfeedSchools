
"use client";

type KeyProps = {
  currentMap: string;
};

export default function KeyOverlay({ currentMap }: KeyProps) {
  return (
    <div
      className="border-t-2 border-[#FF9700] h-auto bg-neutral-200 text-sm py-1 px-2"
      data-testid="legend-key"
    >
      <h1 className="text-lg">Legend</h1>

      <div className="flex flex-wrap gap-y-1 gap-x-3">
        {/* Shared map features */}
        <div className="flex gap-1 items-center">
          <div className="w-6 h-6 bg-neutral-300 rounded-full border-dashed border-2 border-black" />
          <p>Selected Area</p>
        </div>

        <div className="flex gap-1 items-center">
          <div
            className="w-6 h-6 bg-[#72e3ad99] rounded-full"
            data-testid="legend-unique-households-swatch"
          />
          <p>Unique Households Served</p>
        </div>

        {/* School map */}
        {currentMap === "school" && (
          <>
            <div className="flex gap-1 items-center">
              <img
                src="/SmallSatisfeedLogoTransp.png"
                alt="Single School"
                className="w-6 h-6 object-contain"
              />
              <p>Single School</p>
            </div>

            <div className="flex gap-1 items-center">
              <div className="w-6 h-6 bg-[#8c201b] rounded-full border-2 border-white">
                <p className="text-center text-white">#</p>
              </div>
              <p>School Cluster</p>
            </div>

            <div className="flex gap-1 items-center">
              <div className="w-7 h-7 rounded-full border-[3px] border-[#1d3b32] flex items-center justify-center">
                <img
                  src="/SmallSatisfeedLogoTransp.png"
                  alt="Selected School"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <p>Selected School</p>
            </div>

            <div className="flex gap-1 items-center">
              <div className="w-6 h-6 bg-[#4277e841] rounded-full border-2 border-[#2563eb]" />
              <p>School Impact Zone</p>
            </div>
          </>
        )}

        {/* Pantry map */}
        {currentMap === "pantry" && (
          <>
            <div className="flex gap-1 items-center">
              <div className="w-6 h-6 bg-[#FF9700] rounded-full border-2 border-white" />
              <p>Food Pantry</p>
            </div>

              <div className="flex gap-1 items-center">
                <div className="w-6 h-6 bg-[#b00b58] rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">#</span>
                </div>
                <p>Pantry Cluster</p>
              </div>

            <div className="flex gap-1 items-center">
              <div className="w-7 h-7 rounded-full border-[3px] border-[#000] flex items-center justify-center">
                <div className="w-3 h-3 bg-[#f97316] rounded-full" />
              </div>
              <p>Selected Pantry</p>
            </div>

            <div className="flex gap-1 items-center">
              <div className="w-6 h-6 bg-[#4277e841] rounded-full border-2 border-[#2563eb]" />
              <p>Pantry Service Area</p>
            </div>
          </>
        )}

        {/* Library map */}
        {currentMap === "library" && (
          <>
            <div className="flex gap-1 items-center">
              <img
                src="/libary-icon.png"
                alt="Single Library"
                className="w-6 h-6 object-contain"
              />
              <p>Single Library</p>
            </div>

            <div className="flex gap-1 items-center">
              <div className="w-6 h-6 bg-[#15613e] rounded-full border-2 border-white">
                <p className="text-center text-white">#</p>
              </div>
              <p>Library Cluster</p>
            </div>

            <div className="flex gap-1 items-center">
              <div className="w-7 h-7 rounded-full border-[3px] border-[#1d3b32] flex items-center justify-center">
                <img
                  src="/libary-icon.png"
                  alt="Selected Library"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <p>Selected Library</p>
            </div>

            <div className="flex gap-1 items-center">
              <div className="w-6 h-6 bg-[#4277e841] rounded-full border-2 border-[#2563eb]" />
              <p>Library Impact Zone</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
