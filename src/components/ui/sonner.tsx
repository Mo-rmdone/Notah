import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      dir="rtl"
      position="top-center"
      richColors
      toastOptions={{
        style: { fontFamily: "'Cairo', ui-sans-serif, system-ui, sans-serif" },
      }}
      {...props}
    />
  )
}

export { Toaster }
