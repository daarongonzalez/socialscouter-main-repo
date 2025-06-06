import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, BarChart3, User, LogOut, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import iconNameSmall from "@assets/icon-name-small.png";

export function Navbar() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="border-b border-neutral-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <a href="https://socialscouter.ai/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={iconNameSmall} alt="SocialScouter" className="h-8 object-contain" />
              <span className="text-xl font-bold text-neutral-800">SocialScouter</span>
            </a>
          </div>
          <nav className="flex items-center gap-1 md:gap-2">
            <Link href="/history">
              <Button
                variant="ghost"
                className="text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
            <Button variant="ghost" className="text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ads Analyzer
            </Button>
            

          </nav>
        </div>
      </div>
    </header>
  );
}