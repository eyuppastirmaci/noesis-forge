import CustomTooltip from "../ui/CustomTooltip";
import Header from "./Header";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-2 px-6">{children}</main>
      </div>
      <CustomTooltip anchorSelect=".btn-upload">
        Upload
      </CustomTooltip>
      <CustomTooltip anchorSelect=".btn-recent-documents">
        Recent Documents
      </CustomTooltip>
      <CustomTooltip anchorSelect=".btn-notifications">
        Notifications
      </CustomTooltip>
      <CustomTooltip anchorSelect=".btn-processing-queue">
        Processing Queue
      </CustomTooltip>
      <CustomTooltip anchorSelect=".btn-ai-status">
        AI Status
      </CustomTooltip>
    </>
  );
}
