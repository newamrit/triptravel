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
import { MemberAvatar, AvatarPickerField } from './MemberAvatar';

interface MembersViewProps {
  trip: Trip;
  members: Member[];
  onSaveTrip: (trip: Trip) => void;
  onAddMember: (memberData: { name: string; phone?: string; notes?: string; avatar?: string | null; is_leader: boolean }) => void;
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
  const [totalBudget, setTotalBudget] = useState(String(trip.total_budget ?? 35000));

  React.useEffect(() => {
    setTripTitle(trip.title || 'Rara Trip 2026');
    setTripDest(trip.destination || '');
    setCurrency(trip.currency || 'Rs.');
    setTotalBudget(String(trip.total_budget ?? 35000));
  }, [trip]);

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [avatar, setAvatar] = useState<string | null>('preset:mountain-hiker');
  const [isLeader, setIsLeader] = useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [editIsLeader, setEditIsLeader] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);

  const handleTripSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBudget = Math.max(0, Number(totalBudget) || 0);
    onSaveTrip({
      ...trip,
      title: tripTitle.trim() || trip.title,
      destination: tripDest.trim(),
      currency: currency.trim() || 'Rs.',
      total_budget: parsedBudget
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
      avatar: avatar || null,
      is_leader: isLeader
    });

    setName('');
    setPhone('');
    setNotes('');
    setAvatar('preset:mountain-hiker');
    setIsLeader(false);
    setIsAddingMember(false);
  };

  const handleOpenEditMember = (m: Member) => {
    setEditingMember(m);
    setEditName(m.name);
    setEditPhone(m.phone || '');
    setEditNotes(m.notes || '');
    setEditAvatar(m.avatar ?? null);
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
      avatar: editAvatar,
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.08rem', sm: '1.25rem' } }}>
                Trip Profile &amp; Budget Cap
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Trip name, destination, currency, and allocated budget threshold
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsEditingTrip(!isEditingTrip)}
              startIcon={<EditIcon fontSize="small" />}
              sx={{ fontWeight: 700, fontSize: '0.78rem', flexShrink: 0, minHeight: 38, borderRadius: 2.25 }}
            >
              {isEditingTrip ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Box>

          {isEditingTrip ? (
            <form onSubmit={handleTripSave}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.75, mb: 2 }}>
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
                <TextField
                  label={`Total Trip Budget (${currency || 'Rs.'})`}
                  size="small"
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="e.g. 50000"
                  slotProps={{ input: { sx: { borderRadius: 2.5, fontFamily: 'monospace', fontWeight: 700 } } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 800, minHeight: 42, borderRadius: 2.5 }}>
                  Save Changes
                </Button>
              </Box>
            </form>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: { xs: 1.5, sm: 2 }, pt: 0.5 }}>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>
                  Trip Title
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.25 }}>
                  {trip.title}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>
                  Destination
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mt: 0.25 }}>
                  {trip.destination}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>
                  Total Trip Budget
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a', mt: 0.25 }}>
                  {Number(trip.total_budget) > 0
                    ? `${trip.currency} ${Number(trip.total_budget).toLocaleString()}`
                    : 'Not Set'}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>
                  Currency
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace', mt: 0.25 }}>
                  {trip.currency}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>
                  Total Friends
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', mt: 0.25 }}>
                  {members.length} ({members.filter(m => m.is_active).length} active)
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 2. Trip Friends & Members List */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25, mb: 2.5 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.08rem', sm: '1.25rem' } }}>
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
              sx={{ fontWeight: 800, borderRadius: 2.5, whiteSpace: 'nowrap', minHeight: 40, px: 1.75, flexShrink: 0 }}
            >
              {isAddingMember ? 'Close' : 'Add Friend'}
            </Button>
          </Box>

          {/* Add Member Form Drawer */}
          {isAddingMember && (
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: '#f8fafc', mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.75 }}>
                Add New Friend to Trip
              </Typography>
              <form onSubmit={handleMemberSubmit}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 1.75 }}>
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

                <Box sx={{ mb: 1.75 }}>
                  <AvatarPickerField
                    value={avatar}
                    memberName={name || 'New Friend'}
                    isLeader={isLeader}
                    onChange={setAvatar}
                    compact
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
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

                  <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={() => setIsAddingMember(false)} sx={{ color: '#64748b', minHeight: 38 }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" size="small" sx={{ fontWeight: 800, minHeight: 38, px: 2 }}>
                      Save Friend
                    </Button>
                  </Box>
                </Box>
              </form>
            </Paper>
          )}

          {/* Member cards: Stacked action footer on mobile so names & phone numbers never get squeezed */}
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
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1.25,
                }}
              >
                {/* Top: Avatar + Member Info */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.35, minWidth: 0 }}>
                  <MemberAvatar
                    member={m}
                    size="md"
                    showLeaderBadge
                    onClick={() => handleOpenEditMember(m)}
                    tooltip="Tap to change avatar or edit profile"
                  />

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.92rem', wordBreak: 'break-word' }}>
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
                      </Box>

                      <Chip
                        label={m.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: m.is_active ? 'rgba(5, 150, 105, 0.1)' : '#f1f5f9',
                          color: m.is_active ? '#059669' : '#64748b'
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.4 }}>
                      {m.phone && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                          <span>{m.phone}</span>
                        </Typography>
                      )}

                      {m.notes && (
                        <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                          {m.phone ? `· ${m.notes}` : m.notes}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Bottom Action Strip: Clean touch buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pt: 1,
                    borderTop: '1px solid rgba(226, 232, 240, 0.7)',
                    gap: 0.75
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Button
                      size="small"
                      onClick={() => handleOpenEditMember(m)}
                      startIcon={<EditIcon sx={{ fontSize: '15px !important' }} />}
                      sx={{
                        color: '#0284c7',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        minHeight: 34,
                        px: 1.1,
                        borderRadius: 2,
                        bgcolor: 'rgba(2, 132, 199, 0.06)',
                        '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.12)' }
                      }}
                    >
                      Edit &amp; Avatar
                    </Button>

                    <Button
                      size="small"
                      onClick={() => onUpdateMember(m.id, { is_leader: !m.is_leader })}
                      startIcon={<StarsIcon sx={{ fontSize: '15px !important' }} />}
                      sx={{
                        color: m.is_leader ? '#059669' : '#64748b',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        minHeight: 34,
                        px: 1.1,
                        borderRadius: 2,
                        bgcolor: m.is_leader ? 'rgba(5, 150, 105, 0.08)' : '#f8fafc',
                      }}
                    >
                      {m.is_leader ? 'Leader' : 'Make Leader'}
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Button
                      size="small"
                      onClick={() => onUpdateMember(m.id, { is_active: !m.is_active })}
                      sx={{
                        minWidth: 'auto',
                        minHeight: 34,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: m.is_active ? '#64748b' : '#059669',
                        px: 1,
                        borderRadius: 2
                      }}
                    >
                      {m.is_active ? 'Disable' : 'Enable'}
                    </Button>

                    {members.length > 1 && (
                      <Tooltip title="Delete member">
                        <IconButton
                          size="small"
                          aria-label="Delete member"
                          onClick={() => onDeleteMember(m.id)}
                          sx={{ color: '#94a3b8', width: 34, height: 34, '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
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
        scroll="paper"
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: '24px 24px 0 0', sm: 3.5 },
              m: { xs: 0, sm: 2 },
              maxHeight: { xs: '90dvh', sm: '88vh' },
              width: { xs: '100%', sm: 'auto' },
              alignSelf: { xs: 'flex-end', sm: 'center' },
            },
          },
        }}
      >
        {/* Mobile drag handle */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0 }}>
          <Box sx={{ width: 42, height: 4, borderRadius: 2, bgcolor: '#cbd5e1' }} />
        </Box>

        <DialogTitle sx={{ m: 0, p: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
              Edit Friend Profile &amp; Avatar
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Select an avatar icon, upload a custom photo, or update contact details
            </Typography>
          </Box>
          <IconButton onClick={() => setEditingMember(null)} size="small" sx={{ color: '#94a3b8', p: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSaveMemberEdit}>
          <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AvatarPickerField
              value={editAvatar}
              memberName={editName || editingMember?.name || 'Friend'}
              isLeader={editIsLeader}
              onChange={setEditAvatar}
            />

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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pt: 0.5 }}>
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

          <DialogActions
            sx={{
              p: 2.5,
              pt: 1,
              pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', sm: 2.5 },
              gap: 1
            }}
          >
            <Button onClick={() => setEditingMember(null)} sx={{ color: '#64748b', minHeight: 44, px: 2 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon fontSize="small" />}
              sx={{ fontWeight: 800, borderRadius: 2.5, minHeight: 44, px: 2.5, flex: { xs: 1, sm: 'initial' } }}
            >
              Save Updates
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
