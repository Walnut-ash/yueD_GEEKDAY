"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Link, Loader2, Sparkles, Check } from "lucide-react"
import { parseRestaurantLink, type ParsedRestaurant } from "@/lib/parse-link"
import type { Restaurant } from "@/types/restaurant"

interface AddRestaurantDialogProps {
  onAdd: (restaurant: Omit<Restaurant, "id" | "createdAt">) => void
}

export function AddRestaurantDialog({ onAdd }: AddRestaurantDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("link")

  // 链接解析状态
  const [linkUrl, setLinkUrl] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedRestaurant | null>(null)
  const [parseError, setParseError] = useState("")

  // 手动输入状态
  const [manualForm, setManualForm] = useState({
    name: "",
    address: "",
    avgPrice: "",
    openTime: "10:00",
    closeTime: "22:00",
    dishes: "",
    tags: "",
  })

  const handleParseLink = async () => {
    if (!linkUrl.trim()) return

    setParsing(true)
    setParseError("")
    setParsedResult(null)

    try {
      const result = await parseRestaurantLink(linkUrl)
      if (result) {
        setParsedResult(result)
      } else {
        setParseError("无法识别该链接，请尝试手动输入")
      }
    } catch {
      setParseError("解析失败，请稍后重试")
    } finally {
      setParsing(false)
    }
  }

  const handleAddParsed = () => {
    if (parsedResult) {
      onAdd(parsedResult)
      resetAndClose()
    }
  }

  const handleAddManual = () => {
    if (!manualForm.name || !manualForm.address) return

    onAdd({
      name: manualForm.name,
      address: manualForm.address,
      lat: 39.9 + Math.random() * 0.1,
      lng: 116.4 + Math.random() * 0.1,
      avgPrice: Number(manualForm.avgPrice) || 50,
      openTime: manualForm.openTime,
      closeTime: manualForm.closeTime,
      dishes: manualForm.dishes
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      tags: manualForm.tags
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    })
    resetAndClose()
  }

  const resetAndClose = () => {
    setLinkUrl("")
    setParsedResult(null)
    setParseError("")
    setManualForm({
      name: "",
      address: "",
      avgPrice: "",
      openTime: "10:00",
      closeTime: "22:00",
      dishes: "",
      tags: "",
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          添加餐厅
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加餐厅</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Sparkles className="w-4 h-4 mr-2" />
              智能解析
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Plus className="w-4 h-4 mr-2" />
              手动输入
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="link">粘贴小红书/抖音链接</Label>
              <div className="flex gap-2">
                <Input
                  id="link"
                  placeholder="https://www.xiaohongshu.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Button onClick={handleParseLink} disabled={parsing || !linkUrl.trim()}>
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">支持小红书、抖音分享链接，自动识别餐厅信息</p>
            </div>

            {parseError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{parseError}</div>
            )}

            {parsedResult && (
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={parsedResult.imageUrl || "/placeholder.svg"}
                    alt={parsedResult.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{parsedResult.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">{parsedResult.address}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span>¥{parsedResult.avgPrice}/人</span>
                      <span>
                        {parsedResult.openTime}-{parsedResult.closeTime}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {parsedResult.dishes.map((dish) => (
                    <span key={dish} className="px-2 py-0.5 bg-background rounded text-xs">
                      {dish}
                    </span>
                  ))}
                </div>
                <Button onClick={handleAddParsed} className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  确认添加
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">餐厅名称 *</Label>
                  <Input
                    id="name"
                    placeholder="如：海底捞"
                    value={manualForm.name}
                    onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">人均价格</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="100"
                    value={manualForm.avgPrice}
                    onChange={(e) => setManualForm((f) => ({ ...f, avgPrice: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">地址 *</Label>
                <Input
                  id="address"
                  placeholder="如：北京市朝阳区..."
                  value={manualForm.address}
                  onChange={(e) => setManualForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openTime">开业时间</Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={manualForm.openTime}
                    onChange={(e) => setManualForm((f) => ({ ...f, openTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeTime">打烊时间</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={manualForm.closeTime}
                    onChange={(e) => setManualForm((f) => ({ ...f, closeTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dishes">推荐菜品</Label>
                <Textarea
                  id="dishes"
                  placeholder="用逗号分隔，如：番茄锅底，毛肚，虾滑"
                  value={manualForm.dishes}
                  onChange={(e) => setManualForm((f) => ({ ...f, dishes: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">标签</Label>
                <Input
                  id="tags"
                  placeholder="用逗号分隔，如：火锅，川菜"
                  value={manualForm.tags}
                  onChange={(e) => setManualForm((f) => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </div>

            <Button onClick={handleAddManual} className="w-full" disabled={!manualForm.name || !manualForm.address}>
              <Plus className="w-4 h-4 mr-2" />
              添加餐厅
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
