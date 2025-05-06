"use client";

import { useState, useEffect } from 'react';
import Notice from '@/components/ui/Notice';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { TrashIcon, RefreshIcon, BucketIcon, TicketIcon } from '@/components/ui/icons/Icons';
import TokenModal from '@/components/buckets/TokenModal';
import CreateBucketForm from '@/components/buckets/CreateBucketForm';
import styles from './buckets.module.css';
import AppLayout from '../app-layout';

export default function BucketsPage() {
  const [databases, setDatabases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch databases when component mounts
  useEffect(() => {
    fetchDatabases();
  }, []);

  // Function to fetch databases using our server-side API
  const fetchDatabases = async () => {

    setIsLoading(true);
    setError(null);

    try {
      // Call our server-side API route that handles the authentication
      const response = await fetch('/api/influxdb/bucket');

      if (!response.ok) {
        throw new Error(`Failed to fetch buckets: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setDatabases(data.buckets || []);
      } else {
        throw new Error(data.error || 'Failed to fetch buckets');
      }
    } catch (err) {
      console.error('Error fetching buckets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch databases');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle create modal open/close
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Handle successful bucket creation
  const handleBucketCreated = () => {
    closeModal();
    fetchDatabases();
  };
  
  // Handle delete modal open/close
  const openDeleteModal = (databaseName: string) => {
    setDatabaseToDelete(databaseName);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };
  
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDatabaseToDelete(null);
  };
  
  // Handle token modal open/close
  const openTokenModal = (bucketName: string) => {
    setSelectedBucket(bucketName);
    setIsTokenModalOpen(true);
  };
  
  const closeTokenModal = () => {
    setIsTokenModalOpen(false);
    setSelectedBucket(null);
  };
  
  // Handle bucket deletion
  const handleDeleteDatabase = async () => {
    if (!databaseToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/influxdb/bucket?name=${encodeURIComponent(databaseToDelete)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Close the modal and refresh the bucket list
        closeDeleteModal();
        fetchDatabases();
      } else {
        setDeleteError(data.error || 'Failed to delete bucket');
      }
    } catch (err) {
      console.error('Error deleting bucket:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete bucket');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className={styles.tabContent}>
        <div className={styles.header}>
          <h2>Databases</h2>
          <div className={styles.headerButtons}>
            <Button onClick={openModal}>
              Create Bucket <BucketIcon size={16} className={styles.buttonIcon} />
            </Button>
            <Button 
              variant="secondary"
              onClick={fetchDatabases}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'} <RefreshIcon size={16} className={styles.buttonIcon} />
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <p>Loading databases...</p>
        ) : error ? (
          <Notice type="error">{error}</Notice>
        ) : databases.length === 0 ? (
          <Notice type="info">No databases found. Create a database to get started.</Notice>
        ) : (
          <ul className={styles.databaseList}>
            {databases.map((db, index) => (
              <li key={index} className={styles.databaseItem}>
                <div className={styles.databaseName}>{db}</div>
                {/* Don't allow deletion of _internal database */}
                {db !== '_internal' && (
                  <div className={styles.databaseActions}>
                    <Button 
                      variant="outline" 
                      size="small"
                      onClick={() => openTokenModal(db)}
                      className={styles.actionButton}
                      aria-label="Generate token for database"
                    >
                      <TicketIcon size={16} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="small"
                      onClick={() => openDeleteModal(db)}
                      className={styles.deleteButton}
                      aria-label="Delete database"
                    >
                      <TrashIcon size={16} />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        
        
        {/* Create Bucket Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Create New Bucket"
          size="small"
        >
          <CreateBucketForm
            onSuccess={handleBucketCreated}
            onCancel={closeModal}
          />
        </Modal>
        
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          title="Delete Database"
          size="small"
        >
          <div className={styles.deleteConfirmation}>
            {deleteError && <Notice type="error">{deleteError}</Notice>}
            
            <p>Are you sure you want to delete the database <strong>{databaseToDelete}</strong>?</p>
            <p className={styles.deleteWarning}>This action cannot be undone. All data in this database will be permanently deleted.</p>
            
            <div className={styles.deleteActions}>
              <Button 
                variant="outline" 
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteDatabase}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Database'}
              </Button>
            </div>
          </div>
        </Modal>
        
        {/* Token Modal */}
        <TokenModal
          isOpen={isTokenModalOpen}
          onClose={closeTokenModal}
          bucketName={selectedBucket || ''}
        />
      </div>
    </AppLayout>
  );
}
