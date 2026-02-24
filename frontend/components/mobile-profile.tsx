"use client"

import { useState, useEffect } from "react"
import type { RestaurantList } from "@/types/restaurant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Utensils, Plus, Trash2, Share2, ChevronRight, FolderOpen, Copy, Check, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MobileProfileProps {
  lists: RestaurantList[]
  currentListId: string | null
  onSelectList: (id: string) => void
  onCreateList: (name: string) => void
  onDeleteList: (id: string) => void
  currentList?: RestaurantList
}

export function MobileProfile({
  lists,
  currentListId,
  onSelectList,
  onCreateList,
  onDeleteList,
  currentList,
}: MobileProfileProps) {
  const [newListName, setNewListName] = useState("")
  const [showNewListDialog, setShowNewListDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCreateList = () => {
    if (newListName.trim()) {
      onCreateList(newListName.trim())
      setNewListName("")
      setShowNewListDialog(false)
    }
  }

  const handleShare = async () => {
    if (!currentList) return

    // 构造分享链接，包含 listId
    // 假设部署后的域名，或者使用当前 window.location.origin
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const shareUrl = `${origin}?listId=${currentList.id}&action=join`
    
    try {
      await navigator.clipboard.writeText(`来【饭点】和我一起编辑"${currentList.name}"吧！\n点击链接加入：${shareUrl}`)
      setCopied(true)
      toast({
        title: "邀请链接已复制",
        description: "快发给朋友一起编辑餐厅列表吧！",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "请手动复制链接",
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="flex-shrink-0 p-6 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-background flex items-center justify-center shadow-sm border border-border">
            <img src="/logo.png" alt="饭点" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold">饭点</h1>
            <p className="text-sm text-muted-foreground">再也不用翻聊天记录找餐厅了</p>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto">
        {/* 当前列表分享 - 一起吃饭吧 */}
        {currentList && (
          <div className="p-4 border-b">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">一起吃饭吧</h2>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{currentList.name}</h3>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        协作模式
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {currentList.restaurants.length} 家餐厅 · 多人协作中
                  </p>
                </div>
                <Button 
                    className="shrink-0 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4"
                    onClick={handleShare}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-1.5" />
                      邀请好友
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-3 text-xs text-muted-foreground bg-background/50 p-2 rounded-lg border border-border/50">
                <p>点击“邀请好友”复制链接，发送给朋友即可加入此列表，共同编辑餐厅。</p>
              </div>
            </div>
          </div>
        )}

        {/* 收藏列表 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">我的收藏列表</h2>
            <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新建
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新建收藏列表</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="输入列表名称，如：周末聚餐"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                  />
                  <Button onClick={handleCreateList} className="w-full" disabled={!newListName.trim()}>
                    创建列表
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {lists.map((list) => (
              <div
                key={list.id}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-colors ${
                  list.id === currentListId
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-muted/30 border-2 border-transparent"
                }`}
              >
                <button onClick={() => onSelectList(list.id)} className="flex-1 flex items-center gap-3 text-left">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      list.id === currentListId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{list.name}</h3>
                    <p className="text-xs text-muted-foreground">{list.restaurants.length} 家餐厅</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                {lists.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => onDeleteList(list.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 关于 */}
        <div className="p-4 border-t">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">关于</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>解决朋友收藏了餐厅却转眼忘记的问题</p>
            <p>再也不用翻阅聊天记录找餐厅了</p>
          </div>
        </div>
      </div>
    </div>
  )
}
