export default function Home() {
  return (
    <div>
      <h1>Noesis Forge</h1>

      <div className="bg-background text-foreground min-h-screen p-8">
        <h1 className="text-4xl font-bold text-primary">Başlık</h1>
        <p className="text-secondary-foreground mt-2">
          Bu bir paragraf metnidir.
        </p>

        <div className="mt-4 p-4 border border-border rounded-lg bg-card text-card-foreground">
          Bu bir kart bileşenidir.
        </div>

        <div className="flex space-x-4 mt-6">
          <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active">
            Primary Button
          </button>
          <button className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active">
            Secondary Button
          </button>
          <button className="px-4 py-2 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active">
            Accent Button
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <div className="p-3 rounded-md bg-info text-info-foreground">
            Bu bir bilgi mesajıdır.
          </div>
          <div className="p-3 rounded-md bg-success text-success-foreground">
            İşlem başarılı!
          </div>
          <div className="p-3 rounded-md bg-warning text-warning-foreground">
            Dikkatli olun.
          </div>
          <div className="p-3 rounded-md bg-error text-error-foreground">
            Bir hata oluştu.
          </div>
        </div>
      </div>
    </div>
  );
}
