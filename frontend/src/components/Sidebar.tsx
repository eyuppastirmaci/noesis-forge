'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { closeSidebar } from '@/store/slices/sidebarSlice';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Share2,
  Clock,
  Heart,
  Search,
  History,
  MessageSquare,
  MessageCircle,
  User,
  Sliders,
  ChevronDown,
  ChevronRight,
  BookOpen,
  SearchIcon,
  MessageSquareText,
  SettingsIcon,
  Scan,
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
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Main',
    defaultOpen: true,
    icon: LayoutDashboard,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Documents',
    defaultOpen: true,
    icon: BookOpen,
    items: [
      { label: 'All Documents', href: '/documents', icon: FileText },
      { label: 'Upload', href: '/documents/upload', icon: Upload },
      { label: 'Recent', href: '/documents/recent', icon: Clock },
      { label: 'Favorites', href: '/documents/favorites', icon: Heart },
      { label: 'Shared', href: '/documents/shared', icon: Share2 },
    ],
  },
  {
    title: 'Search',
    icon: SearchIcon,
    items: [
      { label: 'Search', href: '/search', icon: Search },
      { label: 'Similarity Matching', href: '/search/matching', icon: Scan },
      { label: 'Search History', href: '/search/history', icon: History },
    ],
  },
  {
    title: 'Chat',
    icon: MessageSquareText,
    items: [
      { label: 'Chat with Documents', href: '/chat', icon: MessageSquare },
      { label: 'New Chat', href: '/chat/new', icon: MessageCircle },
      { label: 'Chat History', href: '/chat/history', icon: History },
    ],
  },
  {
    title: 'Settings',
    icon: SettingsIcon,
    items: [
      { label: 'Profile', href: '/profile', icon: User },
      { label: 'Preferences', href: '/settings', icon: Sliders },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.sidebar.isOpen);
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(sidebarSections.filter(section => section.defaultOpen).map(section => section.title))
  );

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const sidebar = document.querySelector('.sidebar');
      const hamburger = document.querySelector('.hamburger-button');
      
      if (isOpen && sidebar && !sidebar.contains(target) && hamburger && !hamburger.contains(target)) {
        dispatch(closeSidebar());
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, dispatch]);

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

  // Check if a section has any active items
  const isSectionActive = (section: SidebarSection) => {
    return section.items.some(item => isActive(item.href));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => dispatch(closeSidebar())}
        />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
        {sidebarSections.map((section) => {
          const isSectionOpen = openSections.has(section.title);
          const SectionIcon = section.icon;
          
          return (
            <div key={section.title} className="sidebar-section">
              <button
                onClick={() => toggleSection(section.title)}
                className={`sidebar-section-header ${isSectionActive(section) ? 'active' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <SectionIcon size={16} className={`${isSectionActive(section) ? 'text-blue-500' : 'text-foreground-secondary'}`} />
                  <span className={`sidebar-section-title ${isSectionActive(section) ? 'text-blue-500 font-bold' : ''}`}>{section.title}</span>
                </div>
                {isSectionOpen ? (
                  <ChevronDown size={16} className="sidebar-section-icon" />
                ) : (
                  <ChevronRight size={16} className="sidebar-section-icon" />
                )}
              </button>
              
              {isSectionOpen && (
                <div className="sidebar-section-content">
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
                        onClick={() => {
                          // Close sidebar on mobile when clicking a link
                          if (window.innerWidth < 768) {
                            dispatch(closeSidebar());
                          }
                        }}
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
    </>
  );
}