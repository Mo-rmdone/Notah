import type { ReactNode } from 'react'
import type { Control, FieldValues, Path } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// حقول عامة على نوع النموذج، حتى تتشارك نماذج العميل والعقد نفس الترميز دون
// تكرار ودون أي نوع any.
// Generic over the form's value type so the customer and contract forms can
// share one set of controls without duplicating JSX and without any `any`.

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  className?: string
}

interface TextFieldProps<T extends FieldValues> extends BaseProps<T> {
  dir?: 'rtl' | 'ltr'
  inputMode?: 'text' | 'numeric' | 'decimal'
  placeholder?: string
  maxLength?: number
  type?: 'text' | 'date'
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  dir,
  inputMode,
  placeholder,
  maxLength,
  type,
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              dir={dir}
              inputMode={inputMode}
              placeholder={placeholder}
              maxLength={maxLength}
              type={type}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface TextareaFieldProps<T extends FieldValues> extends BaseProps<T> {
  rows?: number
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  rows = 2,
}: TextareaFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea rows={rows} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface SelectFieldProps<T extends FieldValues> extends BaseProps<T> {
  options: Array<{ value: string; label: string }>
  description?: ReactNode
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  options,
  description,
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
