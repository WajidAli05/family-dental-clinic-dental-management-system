import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Wavify from "react-wavify";

const SideBar = ({ title = "Menu", items = [] }) => {
  const location = useLocation();

  return (
    <Sidebar className="bg-white shadow-lg border-r border-gray-100">
      <SidebarContent>
        <SidebarGroup>
          {/* Sidebar Title with Wave */}
          <div className="relative overflow-hidden rounded-b-2xl">
            <SidebarGroupLabel className="text-xl md:text-2xl font-bold py-8 md:py-12 px-3 md:px-4 relative z-10">
              {title}
            </SidebarGroupLabel>

            <Wavify
              fill="#2ec4b6"
              paused={false}
              options={{
                height: 10,
                amplitude: 20,
                speed: 0.15,
                points: 3,
              }}
              className="absolute bottom-0 left-0 w-full opacity-20"
            />
          </div>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 md:space-y-2">
              {items.map((item) => {
                const isActive =
                  item.url &&
                  (location.pathname === item.url ||
                    location.pathname.startsWith(`${item.url}/`));

                const baseClass = `
                  flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3
                  rounded-full
                  text-sm md:text-[16px] font-medium
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#2ec4b6] text-white"
                      : "text-gray-700 hover:bg-[#2ec4b61a] hover:text-[#2ec4b6]"
                  }
                `;

                const Content = (
                  <>
                    <item.icon
                      size={18}
                      className={`md:w-5 md:h-5 ${
                        isActive ? "text-white" : "text-[#2ec4b6]"
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </>
                );

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      {item.onClick ? (
                        <button
                          type="button"
                          onClick={item.onClick}
                          className={baseClass}
                        >
                          {Content}
                        </button>
                      ) : (
                        <Link to={item.url} className={baseClass}>
                          {Content}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default SideBar;