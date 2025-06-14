import { ThemeSwitcher } from "../ThemeSwitcher";

export default function Header() {
  return (
    <div className="w-full flex justify-between items-center px-4 h-[80px]">
      <div className="flex items-center gap-2">
        <div>Logo</div>
        <h1 className="text-2xl font-bold">Noesis Forge</h1>
      </div>
      <ThemeSwitcher />
    </div>
  );
}
