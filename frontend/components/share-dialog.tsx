"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Share2, Copy, Check, Users } from "lucide-react"

interface ShareDialogProps {
  shareCode?: string
  listName: string
}

export function ShareDialog({ shareCode, listName }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}?share=${shareCode}` : ""

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          分享
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            分享「{listName}」
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">分享链接给朋友，大家可以一起编辑这个餐厅列表</p>

          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="font-mono text-sm" />
            <Button onClick={handleCopy} variant="secondary">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{shareCode?.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-medium">分享码</p>
              <p className="text-lg font-mono font-bold tracking-wider">{shareCode}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            注：当前为本地演示版本，实际协同编辑功能需要后端支持
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
