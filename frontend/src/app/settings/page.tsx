import { ThemeSwitcher } from "../../components/ThemeSwitcher";

export default function Settings() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Theme</p>
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme
          </p>
        </div>
        <ThemeSwitcher />
      </div>
    </div>
  );
}
