import RegistryDashboard from "@/components/registry-dashboard";
import { readRegistry } from "@/lib/registry";

export const dynamic = "force-dynamic";

export default function Home() {
  const data = readRegistry();
  return <RegistryDashboard initialData={data} />;
}
