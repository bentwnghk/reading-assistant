"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Shield, GraduationCap, User } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import type { UserWithRole, UserRole } from "@/lib/users"

export default function UserList() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
        toast.success(t("userManagement.roleUpdated"))
      } else {
        toast.error(t("userManagement.roleUpdateFailed"))
      }
    } catch (error) {
      console.error("Failed to update role:", error)
      toast.error(t("userManagement.roleUpdateFailed"))
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="h-3 w-3 mr-1" />
      case "teacher":
        return <GraduationCap className="h-3 w-3 mr-1" />
      default:
        return <User className="h-3 w-3 mr-1" />
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "teacher":
        return "default"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("userManagement.users.description")}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("userManagement.users.name")}</TableHead>
            <TableHead>{t("userManagement.users.email")}</TableHead>
            <TableHead>{t("userManagement.users.role")}</TableHead>
            <TableHead>{t("userManagement.users.class")}</TableHead>
            <TableHead>{t("userManagement.users.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>{user.name?.[0] || user.email?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-32">{user.name || t("userManagement.users.noName")}</span>
                </div>
              </TableCell>
              <TableCell className="truncate max-w-48">{user.email}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center w-fit">
                  {getRoleIcon(user.role)}
                  {t(`userManagement.roles.${user.role}`)}
                </Badge>
              </TableCell>
              <TableCell>
                {user.className ? (
                  <Badge variant="outline">{user.className}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {t("userManagement.roles.student")}
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {t("userManagement.roles.teacher")}
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        {t("userManagement.roles.admin")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("userManagement.users.noUsers")}
        </div>
      )}
    </div>
  )
}
