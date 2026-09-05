import { LoginScreen } from '@/components/auth/login/login-screen';
import { RouteGuard } from '@/components/layout/route-guard';

export default function LoginPage() {
  return (
    <RouteGuard mode="login">
      <LoginScreen />
    </RouteGuard>
  );
}
