import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StarsIcon from '@mui/icons-material/Stars';
import PhoneIcon from '@mui/icons-material/Phone';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Member, Trip } from '../types';

interface MembersViewProps {
  trip: Trip;
  members: Member[];
  onSaveTrip: (trip: Trip) => void;
  onAddMember: (memberData: { name: string; phone?: string; notes?: string; is_leader: boolean }) => void;
  onUpdateMember: (id: number, memberData: Partial<Member>) => void;
  onDeleteMember: (id: number) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  trip,
  members,
  onSaveTrip,
  onAddMember,
  onUpdateMember,
  onDeleteMember
}) => {
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [tripDest, setTripDest] = useState(trip.destination);
  const [currency, setCurrency] = useState(trip.currency);

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isLeader, setIsLeader] = useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsLeader, setEditIsLeader] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);

  const handleTripSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTrip({
      ...trip,
      title: tripTitle.trim() || trip.title,
      destination: tripDest.trim(),
      currency: currency.trim() || 'Rs.'
    });
    setIsEditingTrip(false);
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddMember({
      name: name.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      is_leader: isLeader
    });

    setName('');
    setPhone('');
    setNotes('');
    setIsLeader(false);
    setIsAddingMember(false);
  };

  const handleOpenEditMember = (m: Member) => {
    setEditingMember(m);
    setEditName(m.name);
    setEditPhone(m.phone || '');
    setEditNotes(m.notes || '');
    setEditIsLeader(m.is_leader);
    setEditIsActive(m.is_active);
  };

  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editName.trim()) return;

    onUpdateMember(editingMember.id, {
      name: editName.trim(),
      phone: editPhone.trim() || null,
      notes: editNotes.trim() || null,
      is_leader: editIsLeader,
      is_active: editIsActive
    });

    setEditingMember(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* 1. Trip Profile Card */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                Trip Profile
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Trip name, destination, and currency configuration
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsEditingTrip(!isEditingTrip)}
              startIcon={<EditIcon fontSize="small" />}
              sx={{ fontWeight: 600, fontSize: '0.78rem', shrink: 0 }}
            >
              {isEditingTrip ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Box>

          {isEditingTrip ? (
            <form onSubmit={handleTripSave}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
                <TextField
                  label="Trip Name"
                  size="small"
                  required
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  placeholder="e.g. Rara Trip 2026"
                  slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                />
                <TextField
                  label="Destination"
                  size="small"
                  value={tripDest}
                  onChange={(e) => setTripDest(e.target.value)}
                  placeholder="e.g. Rara Lake & Karnali"
                  slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                />
                <TextField
                  label="Currency Symbol"
                  size="small"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="Rs. or NPR"
                  slotProps={{ input: { sx: { borderRadius: 2.5, fontFamily: 'monospace' } } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 700 }}>
                  Save Changes
                </Button>
              </Box>
            </form>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                  Trip Title
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {trip.title}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                  Destination
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155' }}>
                  {trip.destination}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                  Currency
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                  {trip.currency}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                  Total Friends
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669' }}>
                  {members.length} members ({members.filter(m => m.is_active).length} active)
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 2. Trip Friends & Members List */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                Trip Members ({members.length})
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Manage trip friends, leader custodian, phone numbers & active statuses
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setIsAddingMember(!isAddingMember)}
              startIcon={<PersonAddIcon />}
              sx={{ fontWeight: 700, borderRadius: 2.5, whiteSpace: 'nowrap' }}
            >
              {isAddingMember ? 'Close Form' : 'Add Friend'}
            </Button>
          </Box>

          {/* Add Member Form Drawer */}
          {isAddingMember && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#f8fafc', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                Add New Friend to Trip
              </Typography>
              <form onSubmit={handleMemberSubmit}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
                  <TextField
                    label="Full Name *"
                    size="small"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Subash Gurung"
                    slotProps={{ input: { sx: { borderRadius: 2.5, bgcolor: '#ffffff' } } }}
                  />
                  <TextField
                    label="Phone Number"
                    size="small"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+977-98..."
                    slotProps={{ input: { sx: { borderRadius: 2.5, bgcolor: '#ffffff' } } }}
                  />
                  <TextField
                    label="Role / Note"
                    size="small"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Camp cook, Navigator"
                    slotProps={{ input: { sx: { borderRadius: 2.5, bgcolor: '#ffffff' } } }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isLeader}
                        onChange={(e) => setIsLeader(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={<Typography variant="caption" sx={{ fontWeight: 600 }}>Set as Trip Leader / Float Fund Custodian</Typography>}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={() => setIsAddingMember(false)} sx={{ color: '#64748b' }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" size="small" sx={{ fontWeight: 700 }}>
                      Save Friend
                    </Button>
                  </Box>
                </Box>
              </form>
            </Paper>
          )}

          {/* Member cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
            {members.map((m) => (
              <Paper
                key={m.id}
                variant="outlined"
                sx={{
                  p: { xs: 1.75, sm: 2 },
                  borderRadius: 3,
                  bgcolor: m.is_leader ? 'rgba(5, 150, 105, 0.04)' : '#ffffff',
                  borderColor: m.is_leader ? '#34d399' : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                      {m.name}
                    </Typography>
                    {m.is_leader && (
                      <Chip
                        icon={<StarsIcon sx={{ fontSize: '14px !important', color: '#ffffff !important' }} />}
                        label="Leader"
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#059669', color: '#ffffff' }}
                      />
                    )}
                    {!m.is_active && (
                      <Chip label="Inactive" size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                    )}
                  </Box>

                  {m.phone && (
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, wordBreak: 'break-word' }}>
                      <PhoneIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                      <span>{m.phone}</span>
                    </Typography>
                  )}

                  {m.notes && (
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', display: 'block', mt: 0.25, wordBreak: 'break-word' }}>
                      {m.notes}
                    </Typography>
                  )}
                </Box>

                {/* Actions: Edit, Leader Star, Active Toggle, Delete */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, shrink: 0 }}>
                  <Tooltip title="Edit friend's name, phone or role">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditMember(m)}
                      sx={{ color: '#0284c7', p: 1, '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.08)' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={m.is_leader ? 'Remove leader status' : 'Make trip leader'}>
                    <IconButton
                      size="small"
                      onClick={() => onUpdateMember(m.id, { is_leader: !m.is_leader })}
                      sx={{ color: m.is_leader ? '#059669' : '#94a3b8', p: 1 }}
                    >
                      <StarsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Button
                    size="small"
                    onClick={() => onUpdateMember(m.id, { is_active: !m.is_active })}
                    sx={{
                      minWidth: 'auto',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: m.is_active ? '#64748b' : '#059669',
                      px: 1,
                      py: 0.5,
                    }}
                  >
                    {m.is_active ? 'Active' : 'Enable'}
                  </Button>

                  {members.length > 1 && (
                    <Tooltip title="Delete member">
                      <IconButton
                        size="small"
                        onClick={() => onDeleteMember(m.id)}
                        sx={{ color: '#94a3b8', p: 1, '&:hover': { color: '#ef4444' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Edit Member Modal */}
      <Dialog
        open={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: '20px 20px 0 0', sm: 3.5 },
              m: { xs: 0, sm: 2 },
              position: { xs: 'fixed', sm: 'relative' },
              bottom: { xs: 0, sm: 'auto' },
            },
          },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
              Edit Friend Profile
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Update contact details and trip leadership role
            </Typography>
          </Box>
          <IconButton onClick={() => setEditingMember(null)} size="small" sx={{ color: '#94a3b8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSaveMemberEdit}>
          <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full Name *"
              size="small"
              fullWidth
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
            />
            <TextField
              label="Phone Number"
              size="small"
              fullWidth
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+977-98..."
              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
            />
            <TextField
              label="Role / Note"
              size="small"
              fullWidth
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Driver, Navigator, Photographer"
              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editIsLeader}
                    onChange={(e) => setEditIsLeader(e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Trip Leader / Cash Custodian</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography variant="caption" sx={{ fontWeight: 600 }}>Active Trip Participant</Typography>}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button onClick={() => setEditingMember(null)} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon fontSize="small" />}
              sx={{ fontWeight: 700, borderRadius: 2.5 }}
            >
              Save Updates
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
