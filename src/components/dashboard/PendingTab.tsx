import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Trash2, CloudUpload, RefreshCw, Trash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { offlineDb, type PendingCollection } from "@/lib/offlineDb";
import { useToast } from "@/hooks/use-toast";

interface PendingTabProps {
  isOnline: boolean;
  onSyncComplete?: () => void;
}

const PendingTab = ({ isOnline, onSyncComplete }: PendingTabProps) => {
  const { toast } = useToast();
  const [pendingCollections, setPendingCollections] = useState<PendingCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPendingCollections = async () => {
    setLoading(true);
    try {
      const collections = await offlineDb.pendingCollections.toArray();
      // Sort by created_at descending (newest first)
      collections.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPendingCollections(collections);
    } catch (error) {
      console.error("Error loading pending collections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingCollections();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await offlineDb.pendingCollections.delete(id);
      setPendingCollections(prev => prev.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Pending collection removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleRetry = async (id: string) => {
    if (!isOnline) {
      toast({ title: "Still Offline", description: "Cannot retry while offline", variant: "destructive" });
      return;
    }
    
    // Reset status to pending so auto-sync will pick it up
    await offlineDb.pendingCollections.update(id, { status: 'pending', error_message: undefined });
    setPendingCollections(prev => 
      prev.map(c => c.id === id ? { ...c, status: 'pending' as const, error_message: undefined } : c)
    );
    toast({ title: "Queued for Retry", description: "Will sync shortly..." });
  };

  const handleDeleteAll = async () => {
    try {
      await offlineDb.pendingCollections.clear();
      setPendingCollections([]);
      toast({ title: "All Cleared", description: "All pending collections removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete all", variant: "destructive" });
    }
  };

  const getStatusIcon = (status: PendingCollection['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: PendingCollection['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting to sync';
      case 'syncing':
        return 'Syncing...';
      case 'failed':
        return 'Sync failed';
      case 'completed':
        return 'Synced';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            <div className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5 shrink-0" />
              <span>Pending</span>
              {pendingCollections.length > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                  {pendingCollections.length}
                </span>
              )}
            </div>
          </CardTitle>
          <div className="flex gap-1">
            {pendingCollections.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="duration-0">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all items?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {pendingCollections.length} item(s) from this list. 
                      Synced items have already been uploaded. Pending items will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="duration-0">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAll}
                      className="duration-0 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="sm" onClick={loadPendingCollections}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="rounded-full bg-muted p-3 mb-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-muted-foreground text-center font-medium">All synced!</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              No pending collections to upload
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingCollections.map((collection) => (
              <div
                key={collection.id}
                className="border rounded-lg p-3 bg-card"
              >
                <div className="flex items-start justify-between">
                  <div 
                    className={`flex-1 ${
                      collection.status === 'failed' ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => {
                      if (collection.status === 'failed') {
                        handleRetry(collection.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(collection.status)}
                      <span className="font-medium text-sm">{collection.client_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Truck: {collection.truck_code} • Driver: {collection.driver_name}</p>
                      <p>Items: {collection.items.length} • Signed by: {collection.signed_by}</p>
                      <p>{formatDate(collection.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        collection.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        collection.status === 'syncing' ? 'bg-blue-100 text-blue-700' :
                        collection.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {getStatusText(collection.status)}
                      </span>
                      {collection.status === 'failed' && (
                        <span className="text-xs text-muted-foreground">(tap to retry)</span>
                      )}
                    </div>
                    {collection.error_message && (
                      <p className="text-xs text-red-500 mt-1">{collection.error_message}</p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()} className="duration-0">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {collection.status === 'completed' 
                            ? 'Remove from history?' 
                            : 'Delete pending collection?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {collection.status === 'completed' 
                            ? `This collection for "${collection.client_name}" has already been synced to the server. Remove from local history?`
                            : `This will permanently delete this unsent collection for "${collection.client_name}". This action cannot be undone.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="duration-0">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(collection.id);
                          }}
                          className={`duration-0 ${collection.status === 'completed' 
                            ? '' 
                            : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}`}
                        >
                          {collection.status === 'completed' ? 'Remove' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            
            {!isOnline && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Collections will sync automatically when you're back online
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingTab;

