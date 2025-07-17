import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, BarChart3, User, LogOut, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/icon-name-small.png";

export function Navbar() {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      const { logOut } = await import("@/lib/firebase");
      await logOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
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
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/app/dashboard" className="flex items-center space-x-2">
            <img 
              src={logoImage} 
              alt="SocialScouter" 
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/app/dashboard">
              <Button variant="ghost" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
            <Link href="/app/history">
              <Button variant="ghost" className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl} alt={user?.name} />
                  <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user?.name || user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/app/subscribe" className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Subscription</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}