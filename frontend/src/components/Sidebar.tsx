'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Share2,
  Clock,
  Heart,
  FolderOpen,
  Plus,
  Search,
  SearchX,
  History,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Activity,
  FileBarChart,
  Users,
  Shield,
  UserCheck,
  Settings,
  User,
  Sliders,
  Key,
  Plug,
  Crown,
  UserCog,
  ShieldCheck,
  FileSearch,
  Bell,
  AtSign,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
  defaultOpen?: boolean;
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Main',
    defaultOpen: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Documents',
    defaultOpen: true,
    items: [
      { label: 'All Documents', href: '/documents', icon: FileText },
      { label: 'Upload', href: '/documents/upload', icon: Upload },
      { label: 'Shared', href: '/documents/shared', icon: Share2 },
      { label: 'Recent', href: '/documents/recent', icon: Clock },
      { label: 'Favorites', href: '/documents/favorites', icon: Heart },
    ],
  },
  {
    title: 'Collections',
    items: [
      { label: 'Collections', href: '/collections', icon: FolderOpen },
      { label: 'Create Collection', href: '/collections/create', icon: Plus },
      { label: 'Shared Collections', href: '/collections/shared', icon: Share2 },
    ],
  },
  {
    title: 'Search',
    items: [
      { label: 'Search', href: '/search', icon: Search },
      { label: 'Advanced Search', href: '/search/advanced', icon: SearchX },
      { label: 'Search History', href: '/search/history', icon: History },
    ],
  },
  {
    title: 'Chat',
    items: [
      { label: 'Chat', href: '/chat', icon: MessageSquare },
      { label: 'New Chat', href: '/chat/new', icon: MessageCircle },
      { label: 'Chat History', href: '/chat/history', icon: History },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Overview', href: '/analytics', icon: BarChart3 },
      { label: 'Usage', href: '/analytics/usage', icon: Activity },
      { label: 'Document Stats', href: '/analytics/documents', icon: FileBarChart },
      { label: 'Search Stats', href: '/analytics/search', icon: FileSearch },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Members', href: '/team/members', icon: Users },
      { label: 'Permissions', href: '/team/permissions', icon: Shield },
      { label: 'Activity', href: '/team/activity', icon: Activity },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { label: 'All Notifications', href: '/notifications/all', icon: Bell },
      { label: 'Mentions', href: '/notifications/mentions', icon: AtSign },
      { label: 'Updates', href: '/notifications/updates', icon: RefreshCw },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Profile', href: '/settings/profile', icon: User },
      { label: 'Preferences', href: '/settings/preferences', icon: Sliders },
      { label: 'API Keys', href: '/settings/api-keys', icon: Key },
      { label: 'Integrations', href: '/settings/integrations', icon: Plug },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Admin Panel', href: '/admin', icon: Crown },
      { label: 'Users', href: '/admin/users', icon: UserCog },
      { label: 'Roles', href: '/admin/roles', icon: UserCheck },
      { label: 'Permissions', href: '/admin/permissions', icon: ShieldCheck },
      { label: 'System', href: '/admin/system', icon: Settings },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileSearch },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(sidebarSections.filter(section => section.defaultOpen).map(section => section.title))
  );

  const toggleSection = (sectionTitle: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionTitle)) {
      newOpenSections.delete(sectionTitle);
    } else {
      newOpenSections.add(sectionTitle);
    }
    setOpenSections(newOpenSections);
  };

  const isActive = (href: string) => {
    // Exact match for dashboard
    if (href === '/dashboard') {
      return pathname === href;
    }
    
    // For other routes, check if current path matches exactly or is a direct child
    // But avoid matching parent routes when we're on a more specific child route
    if (pathname === href) {
      return true;
    }
    
    // If we're on a child route, only highlight if it's a direct parent
    if (pathname.startsWith(href + '/')) {
      // Check if there are any more specific matches in the sidebar
      const allHrefs = sidebarSections.flatMap(section => section.items.map(item => item.href));
      const moreSpecificMatch = allHrefs.find(otherHref => 
        otherHref !== href && 
        otherHref.startsWith(href) && 
        pathname.startsWith(otherHref)
      );
      
      // Only return true if there's no more specific match
      return !moreSpecificMatch;
    }
    
    return false;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {sidebarSections.map((section) => {
          const isOpen = openSections.has(section.title);
          
          return (
            <div key={section.title} className="sidebar-section">
              <button
                onClick={() => toggleSection(section.title)}
                className="sidebar-section-header"
              >
                <span className="sidebar-section-title">{section.title}</span>
                {isOpen ? (
                  <ChevronDown size={16} className="sidebar-section-icon" />
                ) : (
                  <ChevronRight size={16} className="sidebar-section-icon" />
                )}
              </button>
              
              {isOpen && (
                <div className="sidebar-section-content">
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
                      >
                        <IconComponent size={18} className="sidebar-item-icon" />
                        <span className="sidebar-item-label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}