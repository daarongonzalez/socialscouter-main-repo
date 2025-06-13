import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, BarChart3, User, LogOut, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/icon-name-small.png";

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
            {user ? (
              <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
                <img src={logoImage} alt="SocialScouter" className="h-10 w-auto" />
              </Link>
            ) : (
              <a href="https://socialscouter.ai/" className="flex items-center hover:opacity-80 transition-opacity">
                <img src={logoImage} alt="SocialScouter" className="h-10 w-auto" />
              </a>
            )}
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
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl} alt={user?.email} />
                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user?.firstName && user?.lastName && (
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                    )}
                    {user?.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/subscribe" className="w-full flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}