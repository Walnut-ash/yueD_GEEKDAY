"use client"

import { useState } from "react"
import type { RestaurantList } from "@/types/restaurant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, FolderOpen, Trash2 } from "lucide-react"

interface ListSelectorProps {
  lists: RestaurantList[]
  currentListId: string | null
  onSelectList: (id: string) => void
  onCreateList: (name: string) => void
  onDeleteList: (id: string) => void
}

export function ListSelector({ lists, currentListId, onSelectList, onCreateList, onDeleteList }: ListSelectorProps) {
  const [newListName, setNewListName] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreate = () => {
    if (newListName.trim()) {
      onCreateList(newListName.trim())
      setNewListName("")
      setDialogOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <FolderOpen className="w-4 h-4 text-muted-foreground" />

      <Select value={currentListId || ""} onValueChange={onSelectList}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="选择列表" />
        </SelectTrigger>
        <SelectContent>
          {lists.map((list) => (
            <SelectItem key={list.id} value={list.id}>
              <div className="flex items-center justify-between w-full">
                <span>{list.name}</span>
                <span className="text-xs text-muted-foreground ml-2">({list.restaurants.length})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新列表</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="列表名称，如：周末聚餐"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} className="w-full">
              创建
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {currentListId && lists.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDeleteList(currentListId)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
