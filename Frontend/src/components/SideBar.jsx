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

const SideBar = ({ title = "Menu", items = [] }) => {
  const location = useLocation();
  
  return (
    <Sidebar className="bg-white shadow-lg border-r border-gray-100">
      <SidebarContent>
        <SidebarGroup>
          {/* Sidebar Title */}
          <SidebarGroupLabel className="text-xl md:text-2xl font-bold py-4 md:py-6 px-3 md:px-4">
            {title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 md:space-y-2">
              {items.map((item) => {
                const isActive = 
                  location.pathname === `/${item.url}` || 
                  location.pathname.startsWith(`/${item.url}/`);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className={`
                          flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3
                          rounded-full
                          text-sm md:text-[16px] font-medium
                          transition-all duration-200
                          ${
                            isActive 
                              ? "bg-[#2ec4b6] text-white" 
                              : "text-gray-700 hover:bg-[#2ec4b61a] hover:text-[#2ec4b6]"
                          }
                        `}
                      >
                        <item.icon
                          size={18}
                          className={`md:w-5 md:h-5 ${isActive ? "text-white" : "text-[#2ec4b6]"}`}
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
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