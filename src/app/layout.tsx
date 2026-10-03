import '@/app/globals.css';
import Nav from '@/app/Nav';
import { getSessionUser } from '@/lib/session';

export const metadata = {
  title: 'DDCPL Tender Monitor',
  description: 'Independent GeM Tender Monitoring Dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Nav user={user ? { email: user.email, name: user.name, role: user.role } : null} />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
