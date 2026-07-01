"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// AlertDialog — thin wrapper around Dialog with confirmation semantics
function AlertDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props}>{children}</Dialog>
}

function AlertDialogTrigger({ ...props }: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      data-slot="alert-dialog-content"
      showCloseButton={false}
      className={cn("max-w-md", className)}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <DialogHeader
      data-slot="alert-dialog-header"
      className={cn(className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<typeof DialogFooter>) {
  return (
    <DialogFooter
      data-slot="alert-dialog-footer"
      className={cn(className)}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      data-slot="alert-dialog-title"
      className={cn(className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      data-slot="alert-dialog-description"
      className={cn(className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { onClick?: () => void }) {
  return (
    <DialogClose
      data-slot="alert-dialog-action"
      render={
        <Button
          className={cn(className)}
          onClick={onClick}
          {...props}
        />
      }
    >
      {children}
    </DialogClose>
  )
}

function AlertDialogCancel({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <DialogClose
      data-slot="alert-dialog-cancel"
      render={
        <Button
          variant="outline"
          className={cn(className)}
        />
      }
    >
      {children ?? "Cancel"}
    </DialogClose>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
}
