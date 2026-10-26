import { z } from 'zod'

// Zod normally probes for `new Function` to speed up parsing. The Content-Security-Policy
// blocks eval, so turn that off. Import { z } from here, never from 'zod' directly.
z.config({ jitless: true })

export { z }
