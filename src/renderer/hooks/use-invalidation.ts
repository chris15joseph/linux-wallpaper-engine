import { trpc, queryClient } from '@/lib/trpc'

export function useInvalidation() {
  trpc.invalidation.onInvalidate.useSubscription(undefined, {
    onData(queryKey) {
      void queryClient.invalidateQueries({ queryKey: [queryKey.split('.')] })
    },
  })
}
