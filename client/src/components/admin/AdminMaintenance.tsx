import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadCloud, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminMaintenance() {
  const [downloading, setDownloading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const handleDownloadBackup = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/api/admin/backup/sql", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate backup");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `numusic_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Backup failed. Check server logs.");
    } finally {
      setDownloading(false);
    }
  };

  const handleResetGenerationCounts = async () => {
    if (!confirm("Are you sure you want to reset all users' generation counts? This will set everyone's monthly generation count to 0.")) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch("/api/admin/reset-generation-counts", {
        method: "POST",
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to reset generation counts");
      }

      toast({
        title: "Success",
        description: "Generation counts have been reset for all users.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to reset generation counts. Check server logs.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Maintenance</h2>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Database Backup</h3>
              <p className="text-sm text-gray-400">Export all tables and data as a SQL file.</p>
            </div>
            <Button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-download-sql-backup"
            >
              <DownloadCloud className="w-4 h-4 mr-2" />
              {downloading ? "Preparing..." : "Download SQL Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Reset Generation Counts</h3>
              <p className="text-sm text-gray-400">Reset all users' monthly generation counts to 0. Use this monthly to refresh limits.</p>
            </div>
            <Button
              onClick={handleResetGenerationCounts}
              disabled={resetting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              data-testid="button-reset-generation-counts"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {resetting ? "Resetting..." : "Reset Generation Counts"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


