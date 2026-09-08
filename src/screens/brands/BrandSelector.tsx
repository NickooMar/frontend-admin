import {Badge} from '@/components/ui/badge'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {STRINGS} from '@/lib/strings'
import type {AdminBrandSummary} from '@/types/brands'

/**
 * Brand switcher. Inactive brands and brands without a reachable tenant stay
 * selectable (the admin may want to see why), they are just flagged.
 */
export function BrandSelector({
  brands,
  value,
  onChange,
  disabled = false,
}: {
  brands: AdminBrandSummary[]
  value: string | null
  onChange: (brandId: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled || brands.length === 0}>
      <SelectTrigger aria-label={STRINGS.brands.selectBrand} className="min-w-60 max-w-80 bg-background">
        <SelectValue placeholder={STRINGS.brands.selectPlaceholder} />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {brands.map((brand) => (
          <SelectItem key={brand._id} value={brand._id}>
            <span className="truncate">{brand.name}</span>
            {!brand.active ? <Badge size="xs">{STRINGS.brands.inactive}</Badge> : null}
            {!brand.tenant.available ? (
              <Badge size="xs" className="bg-destructive/10 text-destructive">
                {STRINGS.brands.tenantUnavailable}
              </Badge>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
