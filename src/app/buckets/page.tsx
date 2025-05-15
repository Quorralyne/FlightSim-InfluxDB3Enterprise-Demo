"use client";

import { useState, useEffect } from 'react';
import Notice from '@/components/ui/Notice';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { TrashIcon, RefreshIcon, BucketIcon, TokenIcon, LinkIcon } from '@/components/ui/icons/Icons';
import TokenModal from '@/components/buckets/TokenModal';
import CreateBucketForm from '@/components/buckets/CreateBucketForm';
import styles from './buckets.module.css';
import AppLayout from '../app-layout';
import { useConfig } from '@/contexts/ConfigContext';

// Interface for bucket info
interface BucketInfo {
  status: 'online' | 'offline';
  hasTable: boolean;
}

// Interface for bucket info map
interface BucketInfoMap {
  [bucketName: string]: BucketInfo;
}

export default function BucketsPage() {
  const { activeBucket, setActiveBucket } = useConfig();
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
  const [bucketInfos, setBucketInfos] = useState<BucketInfoMap>({});

  // Fetch databases when component mounts
  useEffect(() => {
    fetchDatabases();
  }, []);

  // Set up polling for bucket statuses
  useEffect(() => {
    if (databases.length === 0) return;

    const pollBucketStatuses = () => {
      databases.forEach((bucket: string) => {
        if (bucket !== '_internal') { // Skip _internal bucket
          fetchBucketStatus(bucket);
        }
      });
    };

    // Initial poll
    pollBucketStatuses();

    // Set up interval for polling
    const pollInterval = setInterval(pollBucketStatuses, 5000);

    // Clean up interval on unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, [databases]); // Re-establish polling when database list changes
  
  // Handle active bucket changes based on bucket status changes
  useEffect(() => {
    // Skip if no buckets are loaded yet
    if (Object.keys(bucketInfos).length === 0) return;
    
    // Check if current active bucket is offline or doesn't have a table
    if (activeBucket && bucketInfos[activeBucket]) {
      const currentBucketInfo = bucketInfos[activeBucket];
      if (currentBucketInfo.status !== 'online' || !currentBucketInfo.hasTable) {
        console.log(`Active bucket ${activeBucket} is now ${currentBucketInfo.status} or doesn't have a table (hasTable: ${currentBucketInfo.hasTable})`);
        
        // Find the next available bucket that's online and has a table
        const availableBuckets = Object.entries(bucketInfos)
          .filter(([name, info]) => 
            name !== '_internal' && 
            info.status === 'online' && 
            info.hasTable
          )
          .map(([name]) => name);
        
        if (availableBuckets.length > 0) {
          const nextBucket = availableBuckets[0];
          console.log(`Setting active bucket to next available: ${nextBucket}`);
          setActiveBucket(nextBucket);
        } else {
          console.log('No available buckets found, setting active bucket to null');
          setActiveBucket(null);
        }
      }
    }
    
    // If no active bucket is set yet, try to find one that's online and has a table
    if (activeBucket === null) {
      const availableBuckets = Object.entries(bucketInfos)
        .filter(([name, info]) => 
          name !== '_internal' && 
          info.status === 'online' && 
          info.hasTable
        )
        .map(([name]) => name);
      
      if (availableBuckets.length > 0) {
        const nextBucket = availableBuckets[0];
        console.log(`Setting active bucket to available bucket: ${nextBucket}`);
        setActiveBucket(nextBucket);
      }
    }
  }, [bucketInfos, activeBucket]); // Run when bucket infos or active bucket changes

  // Function to fetch bucket status
  const fetchBucketStatus = async (bucketName: string) => {
    try {
      const response = await fetch(`/api/influxdb/bucket/${encodeURIComponent(bucketName)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch bucket status for ${bucketName}: ${response.statusText}`);
      }

      const data = await response.json();
      const bucketInfo = {
        status: data.status,
        hasTable: data.hasTable
      };
      
      // Update the bucket info in state without changing active bucket during render
      setBucketInfos(prev => {
        const updatedInfos = {
          ...prev,
          [bucketName]: bucketInfo
        };
        return updatedInfos;
      });
    } catch (err) {
      console.error(`Error fetching status for bucket ${bucketName}:`, err);
      setBucketInfos(prev => ({
        ...prev,
        [bucketName]: {
          status: 'offline',
          hasTable: false
        }
      }));
      
      // The active bucket changes will be handled by the useEffect hook
      // that watches bucketInfos changes
      console.log(`Bucket ${bucketName} is now marked as offline due to error`);
      // No direct setActiveBucket calls here to avoid React state updates during render
    }
  };

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
        const buckets = data.buckets || [];
        setDatabases(buckets);

        // Initially set activeBucket to null
        // We'll set it to the first bucket that has hasTable: true and status: online
        // when we fetch the bucket statuses
        if (activeBucket !== null) {
          console.log('Current active bucket:', activeBucket);
        } else {
          console.log('No active bucket set yet');
        }

        // Initialize all buckets with default info
        const initialBucketInfos: BucketInfoMap = {};
        buckets.forEach((bucket: string) => {
          initialBucketInfos[bucket] = { status: 'offline', hasTable: false };
        });
        setBucketInfos(initialBucketInfos);

        // Fetch status for each bucket
        buckets.forEach((bucket: string) => {
          if (bucket !== '_internal') { // Skip _internal bucket
            fetchBucketStatus(bucket);
          }
        });
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
          <h2>Buckets</h2>
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
                <div className={styles.databaseName}>
                  <span
                    className={`${styles.statusIndicator} ${bucketInfos[db]?.status === 'online'
                      ? styles.statusOnline
                      : styles.statusOffline
                      }`}
                    title={`Status: ${bucketInfos[db]?.status || 'unknown'}`}
                  />
                  {db}
                </div>
                {/* Don't allow deletion of _internal database */}
                {db !== '_internal' && (
                  <div className={styles.databaseActions}>
                    {bucketInfos[db]?.status === 'online' && bucketInfos[db]?.hasTable && (
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => setActiveBucket(db)}
                        className={`${styles.actionButton} ${activeBucket === db ? styles.activeButton : ''}`}
                        aria-label="Link bucket to data tab"
                        title="Link this bucket to the data tab"
                      >
                        <LinkIcon size={16} />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => openTokenModal(db)}
                      className={styles.actionButton}
                      aria-label="Generate token for database"
                    >
                      <TokenIcon size={16} />
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
