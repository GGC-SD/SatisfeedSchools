export function Tooltip({ children }: { children: React.ReactNode }) {
    return <div className="absolute bg-gray-700 text-white p-2 rounded">{children}</div>;
}