import type { ReactNode } from "react";
import MenuBar from "../MenuBar";
import OntologyCanvas from "../OntologyCanvas";
import DatasetTable from "../DatasetTable";

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <MenuBar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <OntologyCanvas />
        <DatasetTable />
      </main>
      {children}
    </div>
  );
}
