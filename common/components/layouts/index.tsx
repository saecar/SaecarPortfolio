"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import ChatButton from "../../../modules/chat/components/ChatButton";
import Sidebar from "./sidebar";
import PageTransition from "../elements/PageTransition";

const Notif = dynamic(() => import("../elements/Notif"), { ssr: false });

interface LayoutsProps {
  children: React.ReactNode;
}

const Layouts = ({ children }: LayoutsProps) => {
  const pathname = usePathname();

  const isShowChatButton = pathname !== "/chat";
  return (
    <div className="mx-auto max-w-7xl lg:px-12">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-amber-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-neutral-900 focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="mx-auto flex flex-col lg:flex-row lg:gap-5 lg:py-4">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="max-w-[854px] transition-all duration-300 lg:w-4/5 outline-none">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <Notif />
      {isShowChatButton && <ChatButton />}
    </div>
  );
};

export default Layouts;
