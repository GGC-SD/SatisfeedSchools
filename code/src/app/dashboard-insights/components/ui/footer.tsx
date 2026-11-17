"use client"

export default function Footer() {
  return (
    <div className="dashboard-footer flex flex-row items-center justify-center gap-4 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
        &copy; {new Date().getFullYear()} Georgia Gwinnett College – Team Satisfeed
      </p>
    </div>
  );
}