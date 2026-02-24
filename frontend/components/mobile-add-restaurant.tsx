"use client"

import { useState } from "react"
import type { Restaurant } from "@/types/restaurant"
import { parseRestaurantLink, type ParsedRestaurant } from "@/lib/parse-link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link, Sparkles, PenLine, Loader2, Check, MapPin, Edit2, X, FolderHeart, ChevronDown } from "lucide-react"
import type { RestaurantList } from "@/types/restaurant"

interface MobileAddRestaurantProps {
  onAdd: (restaurant: Omit<Restaurant, "id" | "createdAt">, listId?: string) => void
  lists: RestaurantList[]
  currentListId: string | null
}

export function MobileAddRestaurant({ onAdd, lists, currentListId }: MobileAddRestaurantProps) {
  const [activeTab, setActiveTab] = useState("link")
  const [selectedListId, setSelectedListId] = useState<string>(currentListId || lists[0]?.id || "")
  const [showListPicker, setShowListPicker] = useState(false)

  // 链接解析
  const [linkUrl, setLinkUrl] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedRestaurant | null>(null)
  const [parseError, setParseError] = useState("")

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<ParsedRestaurant | null>(null)

  // 手动输入
  const [manualForm, setManualForm] = useState({
    name: "",
    address: "",
    avgPrice: "",
    openTime: "10:00",
    closeTime: "22:00",
    dishes: "",
    tags: "",
    imageUrl: "", // Add image url state
  })
  
  const [geocoding, setGeocoding] = useState(false)

  // Helper to fetch coordinates
  const fetchCoordinates = async (address: string) => {
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      const data = await res.json()
      if (res.ok && data.lat && data.lng) {
        return { 
          lat: data.lat, 
          lng: data.lng, 
          name: data.name, 
          address: data.formattedAddress,
          imageUrl: data.imageUrl // Get image url
        }
      }
    } catch (e) {
      console.error("Geocoding failed", e)
    }
    return null
  }

  const handleParseLink = async () => {
    if (!linkUrl.trim()) return

    setParsing(true)
    setParseError("")
    setParsedResult(null)
    setIsEditing(false)
    setEditForm(null)

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

  const handleStartEdit = () => {
    if (parsedResult) {
      setEditForm({ ...parsedResult })
      setIsEditing(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm(null)
  }

  const handleSaveAndAdd = async () => {
    const dataToAdd = isEditing && editForm ? editForm : parsedResult
    if (dataToAdd) {
      let finalLat = dataToAdd.lat
      let finalLng = dataToAdd.lng

      // If address was edited or original geocoding failed (using default Puning coords), try to re-geocode
      // Simple check: if we are in editing mode, assume address might have changed or user wants to retry
      if (isEditing && editForm?.address) {
         setGeocoding(true)
         const coords = await fetchCoordinates(editForm.address)
         if (coords) {
           finalLat = coords.lat
           finalLng = coords.lng
         }
         setGeocoding(false)
      }

      onAdd({
        ...dataToAdd,
        lat: finalLat,
        lng: finalLng
      }, selectedListId)
      
      setLinkUrl("")
      setParsedResult(null)
      setIsEditing(false)
      setEditForm(null)
    }
  }

  const handleAddManual = async () => {
    if (!manualForm.name) return // Address is optional if name is provided, we can search by name

    setGeocoding(true)
    let lat = 23.30324 // Default Puning
    let lng = 116.16147
    let finalAddress = manualForm.address
    let finalName = manualForm.name
    let finalImageUrl = manualForm.imageUrl

    // Use name + address for search
    const searchStr = manualForm.address ? `${manualForm.address} ${manualForm.name}` : manualForm.name
    
    // Let's rely on the updated geocode API which now returns POI info
    const coords = await fetchCoordinates(searchStr)
    
    if (coords) {
      lat = coords.lat
      lng = coords.lng
      // If user didn't input address, use the one from POI
      if (!finalAddress && coords.address) {
          finalAddress = coords.address
      }
      
      // Use POI image if available and user didn't provide one
      if (coords.imageUrl && !finalImageUrl) {
          finalImageUrl = coords.imageUrl
      }
    }

    setGeocoding(false)

    onAdd({
      name: finalName,
      address: finalAddress || "未知地址", // Fallback
      lat,
      lng,
      avgPrice: Number(manualForm.avgPrice) || 50,
      openTime: manualForm.openTime,
      closeTime: manualForm.closeTime,
      imageUrl: finalImageUrl, // Pass image url
      dishes: manualForm.dishes
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      tags: manualForm.tags
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    }, selectedListId)
    
    setManualForm({
      name: "",
      address: "",
      avgPrice: "",
      openTime: "10:00",
      closeTime: "22:00",
      dishes: "",
      tags: "",
      imageUrl: "",
    })
  }

  const updateEditField = (field: keyof ParsedRestaurant, value: string | number | string[]) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value })
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="flex-shrink-0 p-4 border-b space-y-3">
        <div>
          <h1 className="text-xl font-bold">添加餐厅</h1>
          <p className="text-sm text-muted-foreground mt-1">粘贴链接智能解析，或手动输入</p>
        </div>

        {/* Collection picker */}
        <div className="relative">
          <button
            onClick={() => setShowListPicker(!showListPicker)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border bg-muted/40 transition-colors active:bg-muted"
          >
            <FolderHeart className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate flex-1 text-left">
              {lists.find((l) => l.id === selectedListId)?.name || "选择收藏夹"}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showListPicker ? "rotate-180" : ""}`} />
          </button>

          {showListPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border bg-card shadow-lg overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => {
                      setSelectedListId(list.id)
                      setShowListPicker(false)
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors ${
                      list.id === selectedListId
                        ? "bg-primary/10 text-primary font-medium"
                        : "active:bg-muted"
                    }`}
                  >
                    <FolderHeart className={`w-4 h-4 shrink-0 ${list.id === selectedListId ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="flex-1 truncate">{list.name}</span>
                    <span className="text-xs text-muted-foreground">{list.restaurants.length} 家</span>
                    {list.id === selectedListId && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="link" className="gap-2">
              <Sparkles className="w-4 h-4" />
              智能解析
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="w-4 h-4" />
              手动输入
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label>粘贴小红书/抖音链接</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.xiaohongshu.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleParseLink} disabled={parsing || !linkUrl.trim()} size="icon">
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">支持小红书、抖音分享链接，AI自动识别餐厅信息</p>
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{parseError}</div>
            )}

            {parsedResult && !isEditing && (
              <div className="p-4 rounded-2xl border bg-muted/30 space-y-3">
                <div className="flex gap-3">
                  <img
                    src={parsedResult.imageUrl || "/placeholder.svg"}
                    alt={parsedResult.name}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{parsedResult.name}</h4>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {parsedResult.address}
                    </p>
                    <p className="text-sm mt-1">
                      <span className="text-primary font-semibold">¥{parsedResult.avgPrice}/人</span>
                      <span className="text-muted-foreground ml-2">
                        {parsedResult.openTime}-{parsedResult.closeTime}
                      </span>
                    </p>
                  </div>
                </div>
                {parsedResult.dishes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {parsedResult.dishes.map((dish) => (
                      <span key={dish} className="px-2 py-1 bg-background rounded-lg text-xs">
                        {dish}
                      </span>
                    ))}
                  </div>
                )}
                {parsedResult.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {parsedResult.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleStartEdit} variant="outline" className="flex-1 bg-transparent">
                    <Edit2 className="w-4 h-4 mr-2" />
                    编辑信息
                  </Button>
                  <Button onClick={handleSaveAndAdd} className="flex-1">
                    <Check className="w-4 h-4 mr-2" />
                    确认添加
                  </Button>
                </div>
              </div>
            )}

            {parsedResult && isEditing && editForm && (
              <div className="p-4 rounded-2xl border bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    编辑餐厅信息
                  </h4>
                  <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-name">餐厅名称</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => updateEditField("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address">地址</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => updateEditField("address", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">人均价格</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editForm.avgPrice}
                      onChange={(e) => updateEditField("avgPrice", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>营业时间</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="time"
                        value={editForm.openTime}
                        onChange={(e) => updateEditField("openTime", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-muted-foreground text-xs">-</span>
                      <Input
                        type="time"
                        value={editForm.closeTime}
                        onChange={(e) => updateEditField("closeTime", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-dishes">推荐菜品</Label>
                  <Textarea
                    id="edit-dishes"
                    placeholder="用逗号分隔"
                    value={editForm.dishes.join("，")}
                    onChange={(e) =>
                      updateEditField(
                        "dishes",
                        e.target.value
                          .split(/[,，]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tags">标签</Label>
                  <Input
                    id="edit-tags"
                    placeholder="用逗号分隔"
                    value={editForm.tags.join("，")}
                    onChange={(e) =>
                      updateEditField(
                        "tags",
                        e.target.value
                          .split(/[,，]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCancelEdit} variant="outline" className="flex-1 bg-transparent">
                    取消
                  </Button>
                  <Button onClick={handleSaveAndAdd} className="flex-1">
                    <Check className="w-4 h-4 mr-2" />
                    保存并添加
                  </Button>
                </div>
              </div>
            )}

            {!parsedResult && !parseError && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">粘贴链接，智能识别</p>
                <p className="text-sm mt-1">支持小红书、抖音分享链接</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label htmlFor="name">餐厅名称 *</Label>
              <Input
                id="name"
                placeholder="如：海底捞（朝阳大悦城店）"
                value={manualForm.name}
                onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">地址</Label>
              <Input
                id="address"
                placeholder="如：北京市朝阳区朝阳北路101号（可选，自动搜索）"
                value={manualForm.address}
                onChange={(e) => setManualForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>营业时间</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={manualForm.openTime}
                    onChange={(e) => setManualForm((f) => ({ ...f, openTime: e.target.value }))}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={manualForm.closeTime}
                    onChange={(e) => setManualForm((f) => ({ ...f, closeTime: e.target.value }))}
                    className="flex-1"
                  />
                </div>
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
                placeholder="用逗号分隔，如：火锅，川菜，聚餐"
                value={manualForm.tags}
                onChange={(e) => setManualForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">图片链接 (可选)</Label>
              <Input
                id="imageUrl"
                placeholder="输入图片URL，留空则尝试自动获取"
                value={manualForm.imageUrl}
                onChange={(e) => setManualForm((f) => ({ ...f, imageUrl: e.target.value }))}
              />
            </div>

            <Button onClick={handleAddManual} className="w-full" disabled={!manualForm.name || geocoding}>
              {geocoding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {geocoding ? "正在搜索..." : "添加餐厅"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
