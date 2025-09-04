import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Database, 
  Table, 
  Eye, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Users,
  Music,
  CreditCard,
  Settings,
  BarChart3,
  Shield,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TableData {
  tableName: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  rowCount: number;
  sampleData: any[];
}

interface DatabaseStats {
  totalTables: number;
  totalRows: number;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
  }>;
}

const tableIcons: Record<string, any> = {
  users: Users,
  music_generations: Music,
  subscription_plans: CreditCard,
  site_settings: Settings,
  usage_analytics: BarChart3,
  admin_users: Shield,
  sessions: Database,
};

const tableDescriptions: Record<string, string> = {
  users: "User accounts and authentication data",
  music_generations: "Generated music tracks and metadata",
  subscription_plans: "Available subscription plans and pricing",
  site_settings: "Application configuration settings",
  usage_analytics: "Daily usage statistics and metrics",
  admin_users: "Administrator user accounts",
  sessions: "User session storage data",
};

export function AdminDatabaseManagement() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [modalTable, setModalTable] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DatabaseStats>({
    queryKey: ["/api/admin/database/stats"],
  });

  const { data: tableData, isLoading: tableLoading, refetch: refetchTable } = useQuery<TableData>({
    queryKey: ["/api/admin/database/table", selectedTable],
    enabled: !!selectedTable,
  });

  const { data: modalTableData, isLoading: modalTableLoading } = useQuery<TableData>({
    queryKey: ["/api/admin/database/table", modalTable],
    enabled: !!modalTable,
  });

  const { data: allTables, isLoading: tablesLoading } = useQuery<string[]>({
    queryKey: ["/api/admin/database/tables"],
  });

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setExpandedTables(prev => new Set([...prev, tableName]));
  };

  const formatDataType = (dataType: string) => {
    // Simplify some common PostgreSQL types for display
    const typeMap: Record<string, string> = {
      'character varying': 'varchar',
      'timestamp with time zone': 'timestamp',
      'timestamp without time zone': 'timestamp',
      'double precision': 'float',
      'numeric': 'decimal',
    };
    return typeMap[dataType] || dataType;
  };

  const formatValue = (value: any, dataType: string) => {
    if (value === null || value === undefined) return 'NULL';
    if (dataType.includes('timestamp')) {
      return new Date(value).toLocaleString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  if (statsLoading || tablesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Database Management</h1>
          <p className="text-gray-400 mt-2">View and analyze database tables and data</p>
        </div>
        <Button
          onClick={() => {
            refetchStats();
            if (selectedTable) refetchTable();
          }}
          variant="outline"
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-400" />
              Total Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.totalTables || 0}</div>
            <p className="text-gray-400 text-sm">Database tables</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center">
              <Table className="h-5 w-5 mr-2 text-green-400" />
              Total Rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats?.totalRows?.toLocaleString() || 0}
            </div>
            <p className="text-gray-400 text-sm">Across all tables</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center">
              <Eye className="h-5 w-5 mr-2 text-purple-400" />
              Selected Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {selectedTable ? stats?.tableStats?.find(t => t.tableName === selectedTable)?.rowCount?.toLocaleString() || 0 : '--'}
            </div>
            <p className="text-gray-400 text-sm">
              {selectedTable ? `${selectedTable} rows` : 'No table selected'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tables List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Table className="h-5 w-5 mr-2" />
              Database Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allTables?.map((tableName) => {
                const Icon = tableIcons[tableName] || Database;
                const isExpanded = expandedTables.has(tableName);
                const isSelected = selectedTable === tableName;
                const rowCount = stats?.tableStats?.find(t => t.tableName === tableName)?.rowCount || 0;

                return (
                  <div key={tableName} className="border border-gray-700 rounded-lg">
                    <div
                      className={cn(
                        "p-4 cursor-pointer hover:bg-gray-700 transition-colors",
                        isSelected && "bg-purple-600/20 border-purple-500"
                      )}
                      onClick={() => handleTableSelect(tableName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-white">{tableName}</div>
                            <div className="text-sm text-gray-400">
                              {tableDescriptions[tableName] || 'Database table'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                            {rowCount.toLocaleString()} rows
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTableExpansion(tableName);
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-700">
                        <div className="pt-3 space-y-2">
                          <Button
                            onClick={() => handleTableSelect(tableName)}
                            variant="outline"
                            size="sm"
                            className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Schema
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => setModalTable(tableName)}
                                variant="outline"
                                size="sm"
                                className="w-full bg-purple-600/20 border-purple-500 text-purple-300 hover:bg-purple-600/30"
                              >
                                <Table className="h-4 w-4 mr-2" />
                                View Table Data
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[80vh] bg-gray-900 border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-white flex items-center">
                                  <Table className="h-5 w-5 mr-2" />
                                  {tableName} - Table Data
                                </DialogTitle>
                              </DialogHeader>
                              <div className="overflow-auto max-h-[60vh]">
                                {modalTableLoading ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                                    <span className="ml-2 text-gray-400">Loading table data...</span>
                                  </div>
                                ) : modalTableData ? (
                                  <div className="space-y-4">
                                    {/* Table Info */}
                                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                      <div>
                                        <h3 className="text-lg font-semibold text-white">{modalTableData.tableName}</h3>
                                        <p className="text-gray-400">
                                          {modalTableData.rowCount.toLocaleString()} total rows • Showing first 10 rows
                                        </p>
                                      </div>
                                      <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                                        {modalTableData.columns.length} columns
                                      </Badge>
                                    </div>

                                    {/* Table Data */}
                                    {modalTableData.sampleData.length > 0 ? (
                                      <div className="border border-gray-700 rounded-lg overflow-hidden">
                                        <TableComponent>
                                          <TableHeader>
                                            <TableRow className="bg-gray-800 border-gray-700">
                                              {modalTableData.columns.map((column) => (
                                                <TableHead key={column.column_name} className="text-white font-mono text-xs">
                                                  <div className="space-y-1">
                                                    <div className="font-semibold text-white">{column.column_name}</div>
                                                    <div className="text-gray-300 text-xs">
                                                      {formatDataType(column.data_type)}
                                                      {column.is_nullable === 'NO' && (
                                                        <span className="text-red-400 ml-1">*</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </TableHead>
                                              ))}
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {modalTableData.sampleData.map((row, index) => (
                                              <TableRow key={index} className="border-gray-700 hover:bg-gray-800/50">
                                                {modalTableData.columns.map((column) => {
                                                  const value = row[column.column_name];
                                                  return (
                                                    <TableCell key={column.column_name} className="font-mono text-xs text-white">
                                                      <div className="max-w-xs truncate text-white" title={String(value)}>
                                                        {formatValue(value, column.data_type)}
                                                      </div>
                                                    </TableCell>
                                                  );
                                                })}
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </TableComponent>
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-gray-400">
                                        <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No data found in this table</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-400">
                                    <p>Failed to load table data</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Table Details */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              {selectedTable ? `${selectedTable} Details` : 'Select a Table'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTable ? (
              <div className="text-center py-8 text-gray-400">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a table from the list to view its structure and data</p>
              </div>
            ) : tableLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-700 rounded w-5/6" />
              </div>
            ) : tableData ? (
              <div className="space-y-6">
                {/* Table Schema */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Table Schema</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 text-gray-300">Column</th>
                          <th className="text-left py-2 text-gray-300">Type</th>
                          <th className="text-left py-2 text-gray-300">Nullable</th>
                          <th className="text-left py-2 text-gray-300">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.columns.map((column, index) => (
                          <tr key={index} className="border-b border-gray-800">
                            <td className="py-2 text-white font-mono">{column.column_name}</td>
                            <td className="py-2 text-gray-300 font-mono">{formatDataType(column.data_type)}</td>
                            <td className="py-2">
                              <Badge 
                                variant={column.is_nullable === 'YES' ? 'destructive' : 'secondary'}
                                className={column.is_nullable === 'YES' ? 'bg-red-900/20 text-red-400' : 'bg-gray-700 text-gray-300'}
                              >
                                {column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                              </Badge>
                            </td>
                            <td className="py-2 text-gray-400 font-mono">
                              {column.column_default || '--'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample Data */}
                {tableData.sampleData.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Sample Data (First 10 rows)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            {Object.keys(tableData.sampleData[0]).map((key) => (
                              <th key={key} className="text-left py-2 text-gray-300 font-mono">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.sampleData.map((row, index) => (
                            <tr key={index} className="border-b border-gray-800">
                              {Object.entries(row).map(([key, value]) => {
                                const column = tableData.columns.find(c => c.column_name === key);
                                return (
                                  <td key={key} className="py-2 text-gray-300 font-mono text-xs">
                                    {formatValue(value, column?.data_type || '')}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {tableData.sampleData.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No data found in this table</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Failed to load table data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
