import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // --- Auth & Navigation State ---
      token: "",
      role: "user",
      profileUser: null,
      view: "landing",
      
      setToken: (token) => set({ token }),
      setRole: (role) => set({ role }),
      setProfileUser: (profileUser) => set({ profileUser }),
      setView: (view) => set({ view }),

      // --- Global Data State ---
      jobs: [],
      setJobs: (updater) => set((state) => ({ jobs: typeof updater === 'function' ? updater(state.jobs) : updater })),
      
      leads: [],
      setLeads: (updater) => set((state) => ({ leads: typeof updater === 'function' ? updater(state.leads) : updater })),
      
      reqs: [],
      setReqs: (updater) => set((state) => ({ reqs: typeof updater === 'function' ? updater(state.reqs) : updater })),
      
      customers: [],
      setCustomers: (updater) => set((state) => ({ customers: typeof updater === 'function' ? updater(state.customers) : updater })),

      custData: {},
      setCustData: (updater) => set((state) => ({ custData: typeof updater === 'function' ? updater(state.custData) : updater })),

      equipment: [],
      setEquipment: (updater) => set((state) => ({ equipment: typeof updater === 'function' ? updater(state.equipment) : updater })),

      baseLabor: [],
      setBaseLabor: (updater) => set((state) => ({ baseLabor: typeof updater === 'function' ? updater(state.baseLabor) : updater })),

      statusList: [],
      setStatusList: (updater) => set((state) => ({ statusList: typeof updater === 'function' ? updater(state.statusList) : updater })),

      globalSitesCount: 0,
      setGlobalSitesCount: (updater) => set((state) => ({ globalSitesCount: typeof updater === 'function' ? updater(state.globalSitesCount) : updater })),
      
      appUsers: [],
      setAppUsers: (updater) => set((state) => ({ appUsers: typeof updater === 'function' ? updater(state.appUsers) : updater })),

      // --- UI & Persistent State ---
      leadStageFilter: "all",
      setLeadStageFilter: (updater) => set((state) => ({ leadStageFilter: typeof updater === 'function' ? updater(state.leadStageFilter) : updater })),
      active: null,
      setActive: (updater) => set((state) => ({ active: typeof updater === 'function' ? updater(state.active) : updater })),
      globalSelectedQuote: null,
      setGlobalSelectedQuote: (updater) => set((state) => ({ globalSelectedQuote: typeof updater === 'function' ? updater(state.globalSelectedQuote) : updater })),
      selC: null,
      setSelC: (updater) => set((state) => ({ selC: typeof updater === 'function' ? updater(state.selC) : updater })),
      search: "",
      setSearch: (updater) => set((state) => ({ search: typeof updater === 'function' ? updater(state.search) : updater })),
      dashReportId: null,
      setDashReportId: (updater) => set((state) => ({ dashReportId: typeof updater === 'function' ? updater(state.dashReportId) : updater })),
      dashAcc: "leads",
      setDashAcc: (updater) => set((state) => ({ dashAcc: typeof updater === 'function' ? updater(state.dashAcc) : updater })),
      wonOnly: false,
      setWonOnly: (updater) => set((state) => ({ wonOnly: typeof updater === 'function' ? updater(state.wonOnly) : updater })),
      custView: "list",
      setCustView: (updater) => set((state) => ({ custView: typeof updater === 'function' ? updater(state.custView) : updater })),
      jobListFilter: null,
      setJobListFilter: (updater) => set((state) => ({ jobListFilter: typeof updater === 'function' ? updater(state.jobListFilter) : updater })),

      leadsSearch: "",
      setLeadsSearch: (updater) => set((state) => ({ leadsSearch: typeof updater === 'function' ? updater(state.leadsSearch) : updater })),
      leadsView: "list",
      setLeadsView: (updater) => set((state) => ({ leadsView: typeof updater === 'function' ? updater(state.leadsView) : updater })),
      selLead: null,
      setSelLead: (updater) => set((state) => ({ selLead: typeof updater === 'function' ? updater(state.selLead) : updater })),

      // --- Actions ---
      logout: () => set({ token: "", role: "user", profileUser: null, view: "landing" }),
    }),
    {
      name: 'rigpro_app_store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the auth and navigation state, keep data fresh
      partialize: (state) => ({ 
        token: state.token, 
        role: state.role, 
        profileUser: state.profileUser,
        view: state.view,
        leadStageFilter: state.leadStageFilter,
        active: state.active,
        selC: state.selC,
        search: state.search,
        dashReportId: state.dashReportId,
        dashAcc: state.dashAcc,
        wonOnly: state.wonOnly,
        custView: state.custView,
        jobListFilter: state.jobListFilter,
        leadsSearch: state.leadsSearch,
        leadsView: state.leadsView,
        selLead: state.selLead
      }),
    }
  )
);
