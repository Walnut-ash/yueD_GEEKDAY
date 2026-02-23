"use client"

import { useState } from "react"
import type { RestaurantList } from "@/types/restaurant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Utensils, Plus, Trash2, Share2, ChevronRight, FolderOpen, Copy, Check } from "lucide-react"

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

  const handleCreateList = () => {
    if (newListName.trim()) {
      onCreateList(newListName.trim())
      setNewListName("")
      setShowNewListDialog(false)
    }
  }

  const handleCopyShareCode = () => {
    if (currentList?.shareCode) {
      navigator.clipboard.writeText(currentList.shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
        {/* 当前列表分享 */}
        {currentList && (
          <div className="p-4 border-b">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">当前列表</h2>
            <div className="p-4 rounded-2xl bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{currentList.name}</h3>
                  <p className="text-sm text-muted-foreground">{currentList.restaurants.length} 家餐厅</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyShareCode}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-1" />
                      分享
                    </>
                  )}
                </Button>
              </div>
              {currentList.shareCode && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">分享码</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-background rounded-lg text-sm font-mono truncate">
                      {currentList.shareCode}
                    </code>
                    <Button variant="ghost" size="icon" onClick={handleCopyShareCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
