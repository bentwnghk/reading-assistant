"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Shield, GraduationCap, User, ArrowUpDown, School } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import type { UserWithRole, UserRole, SchoolInfo } from "@/lib/users"

type SortField = "name" | "email" | "className" | "schoolName"
type SortOrder = "asc" | "desc"

export default function UserList() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [schoolFilter, setSchoolFilter] = useState<string>("all")

  const loadData = useCallback(async () => {
    try {
      const [usersRes, schoolsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/schools"),
      ])
      if (usersRes.ok) {
        setUsers(await usersRes.json())
      }
      if (schoolsRes.ok) {
        setSchools(await schoolsRes.json())
      }
    } catch (error) {
      console.error("Failed to load users:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>()
    users.forEach(u => {
      if (u.className) classes.add(u.className)
    })
    return Array.from(classes).sort()
  }, [users])

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users]

    if (roleFilter !== "all") {
      result = result.filter(u => u.role === roleFilter)
    }

    if (classFilter !== "all") {
      result = result.filter(u => u.className === classFilter)
    }

    if (schoolFilter !== "all") {
      if (schoolFilter === "__none__") {
        result = result.filter(u => !u.schoolId)
      } else {
        result = result.filter(u => u.schoolId === schoolFilter)
      }
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "")
          break
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "")
          break
        case "className":
          comparison = (a.className || "").localeCompare(b.className || "")
          break
        case "schoolName":
          comparison = (a.schoolName || "").localeCompare(b.schoolName || "")
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [users, sortField, sortOrder, roleFilter, classFilter, schoolFilter])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

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

  const handleSchoolChange = async (userId: string, schoolId: string) => {
    const resolvedSchoolId = schoolId === "__none__" ? null : schoolId
    try {
      const response = await fetch(`/api/users/${userId}/school`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: resolvedSchoolId }),
      })

      if (response.ok) {
        const matchingSchool = schools.find(s => s.id === resolvedSchoolId)
        setUsers(users.map(u =>
          u.id === userId
            ? { ...u, schoolId: resolvedSchoolId ?? undefined, schoolName: matchingSchool?.name }
            : u
        ))
        toast.success(t("userManagement.schoolUpdated"))
      } else {
        toast.error(t("userManagement.schoolUpdateFailed"))
      }
    } catch (error) {
      console.error("Failed to update school:", error)
      toast.error(t("userManagement.schoolUpdateFailed"))
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
        return "destructive" as const
      case "teacher":
        return "default" as const
      default:
        return "secondary" as const
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
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("userManagement.users.role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("userManagement.users.allRoles")}</SelectItem>
            <SelectItem value="admin">{t("userManagement.roles.admin")}</SelectItem>
            <SelectItem value="teacher">{t("userManagement.roles.teacher")}</SelectItem>
            <SelectItem value="student">{t("userManagement.roles.student")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("userManagement.users.class")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("userManagement.users.allClasses")}</SelectItem>
            {uniqueClasses.map((className) => (
              <SelectItem key={className} value={className}>
                {className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("userManagement.users.school")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("userManagement.users.allSchools")}</SelectItem>
            <SelectItem value="__none__">{t("userManagement.users.noSchool")}</SelectItem>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {t("userManagement.users.showing", { count: filteredAndSortedUsers.length })}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("name")}>
                {t("userManagement.users.name")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("email")}>
                {t("userManagement.users.email")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>{t("userManagement.users.role")}</TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("className")}>
                {t("userManagement.users.class")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("schoolName")}>
                {t("userManagement.users.school")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>{t("userManagement.users.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedUsers.map((user) => (
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
                {user.schoolName ? (
                  <div className="flex items-center gap-1">
                    <School className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm max-w-32 break-words">{user.schoolName}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {/* Role selector */}
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
                  {/* School selector — admin override */}
                  {schools.length > 0 && (
                    <Select
                      value={user.schoolId ?? "__none__"}
                      onValueChange={(value) => handleSchoolChange(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder={t("userManagement.users.noSchool")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">{t("userManagement.users.noSchool")}</span>
                        </SelectItem>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filteredAndSortedUsers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("userManagement.users.noUsers")}
        </div>
      )}
    </div>
  )
}
