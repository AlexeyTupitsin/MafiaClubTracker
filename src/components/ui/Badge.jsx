export function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-gray-100 text-gray-800",
    red: "bg-red-100 text-red-700",
    black: "bg-gray-800 text-white",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      styles[variant] || styles.default
    }`}>
      {children}
    </span>
  );
}
