import * as React from "react"
import { Game } from "@/types/game"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"

interface GameTableRowProps {
  game: Game
  onEdit: (game: Game) => void
  onDelete: (id: string) => void
  getStatusColor: (status: Game['status']) => "default" | "secondary" | "destructive"
}

export const GameTableRow = React.memo(({ game, onEdit, onDelete, getStatusColor }: GameTableRowProps) => {
  return (
    <TableRow>
      <TableCell>
        {game.coverImage && (
          <img
            src={game.coverImage}
            alt={game.title}
            className="h-12 w-12 rounded object-cover"
          />
        )}
      </TableCell>
      <TableCell className="font-medium">{game.title}</TableCell>
      <TableCell>
        <Badge variant={getStatusColor(game.status)}>
          {game.status}
        </Badge>
      </TableCell>
      <TableCell>{game.percentage}%</TableCell>
      <TableCell>{game.hoursPlayed}h {game.minutesPlayed}m</TableCell>
      <TableCell>{game.daysPlayed}</TableCell>
      <TableCell>{game.console}</TableCell>
      <TableCell>{game.isGift ? 'Gift' : `$${game.price.toFixed(2)}`}</TableCell>
      <TableCell>{game.isGift ? 'Gift' : game.pricePerHour.toFixed(2)}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(game)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(game.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})

GameTableRow.displayName = "GameTableRow"
