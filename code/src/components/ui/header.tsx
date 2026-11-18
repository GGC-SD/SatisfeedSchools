"use client";

export default function Header() {

  return (
    <div className="dashboard-header flex flex-row items-center justify-center gap-4 p-4">
      <img src="/Satisfeed logo.png" alt="Satisfeed Logo" className="h-16 w-auto border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-xl shadow-black/20"  />
      <h1 className="text-3xl font-black m-0"> Satisfeed: Served Homes near Schools and Libraries</h1>
    </div>
  );
}