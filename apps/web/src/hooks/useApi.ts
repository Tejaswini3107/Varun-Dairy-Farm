import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAdminQuery<T>(key: string[], url: string, opts: { refetchInterval?: number } = {}) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api.get<T>(url),
    refetchInterval: opts.refetchInterval ?? 5000,
    staleTime: 3000,
  });
}

export function useApiMutation<T>(method: "post" | "patch" | "del", urlFn: (vars: any) => string) {
  const qc = useQueryClient();
  return useMutation<T, Error, any>({
    mutationFn: (vars: any) => {
      const url = urlFn(vars);
      if (method === "del") return api.del<T>(url);
      return api[method]<T>(url, vars.body ?? vars);
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
