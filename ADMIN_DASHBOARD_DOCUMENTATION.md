# NuMusic Admin Dashboard Documentation

## Overview

The NuMusic Admin Dashboard is a comprehensive management interface that allows administrators to oversee all aspects of the music generation platform. This dashboard provides tools for user management, subscription plan administration, music track oversight, and site configuration.

## Access and Authentication

### Login
- **URL**: `/admin/login`
- **Credentials**: Username and password required
- **Security**: Session-based authentication with automatic logout on inactivity

### Default Admin Account
- A default admin account is automatically created during system initialization
- **Default Username**: `admin`
- **Default Password**: `admin123` (should be changed immediately after first login)

## Dashboard Sections

### 1. Dashboard (Main Overview)

**Purpose**: Provides a high-level overview of platform activity and key metrics.

**Key Metrics Displayed**:
- **Total Users**: Number of registered users on the platform
- **Total Generations**: Total number of music tracks created
- **Public Tracks**: Number of tracks set to public visibility
- **Private Tracks**: Number of tracks set to private
- **New Users Today**: Users who registered today
- **Generations Today**: Music tracks created today

**Features**:
- Real-time statistics updated automatically
- Visual cards with icons for easy reading
- Color-coded metrics for quick identification

### 2. User Management

**Purpose**: Manage regular user accounts, their subscriptions, and account status.

**Key Features**:

#### User List View
- **User Information**: Email, first name, last name, registration date
- **Account Status**: Email verification status, account activity
- **Subscription Details**: Current plan, plan status, usage statistics
- **Generation Count**: Number of music tracks created by each user

#### User Actions
- **Edit User**: Modify user details (name, email, verification status)
- **Manage Subscription**: Change user's subscription plan and status
- **Delete User**: Permanently remove user account (with confirmation)
- **View Details**: Access comprehensive user information

#### Subscription Management
- **Plan Assignment**: Assign users to different subscription tiers
- **Status Control**: Activate, suspend, or cancel user subscriptions
- **Usage Tracking**: Monitor generation limits and current usage
- **Plan History**: View subscription changes over time

#### User Statistics
- **Generation Count**: Track how many tracks each user has created
- **Plan Usage**: Monitor subscription plan utilization
- **Account Activity**: View last login and account creation dates

### 3. Subscription Plans

**Purpose**: Create, modify, and manage subscription plans that users can purchase.

**Key Features**:

#### Plan Creation
- **Plan Details**: Name, description, features list
- **Pricing**: Set weekly, monthly, and yearly pricing
- **Generation Limits**: Define maximum tracks per month
- **Features**: List of features included in the plan
- **Status**: Active/inactive plan status

#### Plan Management
- **Edit Plans**: Modify existing plan details and pricing
- **Delete Plans**: Remove plans (with user impact warnings)
- **Plan Activation**: Enable/disable plans for new subscriptions
- **Sort Order**: Control the display order of plans

#### Pricing Configuration
- **Multiple Billing Cycles**: Support for weekly, monthly, yearly pricing
- **Price IDs**: Integration with payment processor price IDs
- **Feature Lists**: Customizable feature descriptions
- **Generation Limits**: Configurable track generation allowances

#### Plan Analytics
- **Usage Statistics**: Track plan popularity and usage
- **Revenue Tracking**: Monitor subscription revenue
- **User Distribution**: See how many users are on each plan

### 4. Music Tracks

**Purpose**: Oversee all user-generated music tracks and manage gallery visibility.

**Key Features**:

#### Track Overview
- **Total Tracks**: Complete count of all generated tracks
- **Public Tracks**: Tracks visible in the public gallery
- **Private Tracks**: User-private tracks
- **Gallery Visible**: Tracks approved for public display

#### Track Management
- **View Details**: Access track information, generation parameters, and metadata
- **Visibility Control**: Toggle public/private status of tracks
- **Gallery Approval**: Control which tracks appear in the public gallery
- **Track Deletion**: Remove tracks from the platform (with confirmation)

#### Track Information
- **Generation Data**: Tags, lyrics, duration, generation date
- **User Attribution**: Track which user created each piece
- **Audio Access**: Direct links to audio files
- **Status Tracking**: Monitor track processing and completion status

#### Content Moderation
- **Review Process**: Approve or reject tracks for public gallery
- **Content Filtering**: Manage inappropriate content
- **Quality Control**: Ensure platform content standards

### 5. Site Settings

**Purpose**: Configure global platform settings and administrative preferences.

**Key Features**:

#### General Settings
- **Site Configuration**: Platform-wide settings and preferences
- **Feature Toggles**: Enable/disable platform features
- **System Parameters**: Configure technical settings

#### Security Settings
- **Admin Password**: Change administrator account password
- **Security Policies**: Configure authentication and security settings
- **Access Control**: Manage administrative permissions

#### Integration Settings
- **API Configuration**: External service integration settings
- **Payment Settings**: Payment processor configuration
- **Email Settings**: Email service configuration

#### System Maintenance
- **Cache Management**: Clear system caches
- **Data Management**: Backup and restore options
- **Performance Settings**: Optimize system performance

## Administrative Functions

### User Support
- **Account Recovery**: Help users regain access to their accounts
- **Subscription Issues**: Resolve billing and subscription problems
- **Content Disputes**: Handle user reports and content issues

### System Monitoring
- **Performance Tracking**: Monitor system performance and usage
- **Error Logging**: Review system errors and issues
- **Usage Analytics**: Track platform usage patterns

### Content Management
- **Gallery Curation**: Manage the public music gallery
- **Content Moderation**: Review and approve user-generated content
- **Quality Assurance**: Ensure platform content standards

## Security Features

### Authentication
- **Session Management**: Secure session handling with automatic timeout
- **Password Security**: Encrypted password storage and validation
- **Access Control**: Role-based access to administrative functions

### Data Protection
- **User Privacy**: Secure handling of user data and information
- **Content Security**: Protection of user-generated content
- **System Security**: Secure API endpoints and data transmission

## Best Practices

### User Management
1. **Regular Reviews**: Periodically review user accounts and activity
2. **Support Documentation**: Maintain clear records of user interactions
3. **Privacy Compliance**: Ensure user data handling meets privacy requirements

### Content Moderation
1. **Consistent Standards**: Apply consistent content guidelines
2. **Timely Reviews**: Review reported content promptly
3. **User Communication**: Maintain clear communication with users about content decisions

### System Administration
1. **Regular Backups**: Maintain regular system backups
2. **Security Updates**: Keep the system updated with security patches
3. **Performance Monitoring**: Monitor system performance and address issues promptly

### Subscription Management
1. **Plan Optimization**: Regularly review and optimize subscription plans
2. **User Communication**: Keep users informed about plan changes
3. **Revenue Tracking**: Monitor subscription revenue and trends

## Troubleshooting

### Common Issues

#### User Access Problems
- **Password Reset**: Guide users through password reset process
- **Account Lockout**: Unlock accounts that have been temporarily suspended
- **Email Verification**: Help users complete email verification

#### Subscription Issues
- **Billing Problems**: Resolve payment processing issues
- **Plan Changes**: Assist with subscription plan modifications
- **Usage Limits**: Help users understand and manage generation limits

#### Content Issues
- **Upload Problems**: Troubleshoot music generation and upload issues
- **Visibility Settings**: Help users manage track visibility
- **Gallery Display**: Resolve issues with public gallery display

### Support Resources
- **System Logs**: Review system logs for error diagnosis
- **User Feedback**: Monitor user feedback and support requests
- **Documentation**: Maintain updated documentation for common procedures

## Contact and Support

For technical support or questions about the admin dashboard:
- **System Administrator**: Contact the system administrator for technical issues
- **Documentation**: Refer to this documentation for common procedures
- **Training**: Request additional training for new administrators

---

*This documentation should be updated regularly to reflect any changes to the admin dashboard functionality.*
