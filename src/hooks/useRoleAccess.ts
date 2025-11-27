export const useRoleAccess = (userType: string) => {
  const isAdmin = userType === 'admin';
  const isMechanic = userType === 'mechanic';
  const isCollector = userType === 'collector';
  const isHR = userType === 'hr';

  return {
    // Tab access
    canAccessCollections: isAdmin || isCollector,
    canAccessClients: isAdmin || isCollector,
    canAccessTrucks: isAdmin,
    canAccessPersonnel: isAdmin,
    canAccessMechanics: isAdmin || isMechanic,
    canAccessScheduling: isAdmin,
    canAccessHR: isAdmin || isHR,
    canAccessAnalytics: isAdmin,
    canAccessSettings: isAdmin,

    // Data operations
    canImportExport: isAdmin,
    canEditClients: isAdmin,
    canEditTrucks: isAdmin,
    canEditPersonnel: isAdmin,
    
    // Mechanic permissions
    canCheckoutTools: isAdmin || isMechanic,
    canManageJobOrders: isAdmin || isMechanic,
    
    // Collector permissions
    canPrintReceipts: isAdmin || isCollector,
    canCreateReceipts: isAdmin || isCollector,
    
    // HR permissions
    canFileLeave: isAdmin || isHR,
    canAccessHRAdmin: isAdmin,
    
    // Role checks
    isAdmin,
    isMechanic,
    isCollector,
    isHR
  };
};